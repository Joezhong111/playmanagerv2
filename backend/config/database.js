import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'root', 
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'dispatch_system',
  timezone: '+08:00', // 设置为北京时间（UTC+8）
  dateStrings: false, // 使用Date对象，便于时区转换
  ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 12, // 适中的连接池大小
  queueLimit: 0,
  charset: 'utf8mb4',
  acquireTimeout: 90000, // 增加到90秒以适应长时间挂机
  timeout: 90000, // 增加到90秒
  idleTimeout: 300000, // 5分钟空闲超时 (减少)
  maxIdle: 6, // 最大空闲连接数 (减少)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 在每个连接建立时设置时区和参数
let connectionCount = 0;
pool.on('connection', function (connection) {
  connection.query("SET time_zone = '+08:00'");
  connection.query("SET names utf8mb4");
  // 设置连接参数以优化长时间连接
  connection.query("SET SESSION wait_timeout = 28800"); // 8小时
  connection.query("SET SESSION interactive_timeout = 28800"); // 8小时
  connectionCount++;
  if (connectionCount <= 1 || process.env.NODE_ENV === 'development') {
    console.log(`数据库连接已设置时区: +08:00 (北京时间) [连接数: ${connectionCount}]`);
  }
});

// 监听连接错误
pool.on('error', function(err) {
  console.error('Database pool error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection lost, pool will reconnect automatically');
  } else {
    console.error('Database pool error:', err);
  }
});

// 定期健康检查和连接池监控
let healthCheckInterval;
const startHealthCheck = () => {
  // 每5分钟检查一次数据库连接健康状态
  healthCheckInterval = setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      
      // 输出连接池状态信息 - 使用 getPoolStatus 函数
      const poolStats = getPoolStatus();
      
      console.log('Database health check passed', {
        activeConnections: poolStats.activeConnections,
        freeConnections: poolStats.freeConnections,
        totalConnections: poolStats.totalConnections,
        limit: poolStats.connectionLimit,
        utilization: `${poolStats.utilizationRate}%`
      });
      
      // 如果连接数过多，给出警告
      if (poolStats.utilizationRate > 80) {
        console.warn(`⚠️  连接池使用率较高: ${poolStats.totalConnections}/${poolStats.connectionLimit} (${poolStats.utilizationRate}%)`);
      }
      
    } catch (error) {
      console.error('Database health check failed:', error);
    }
  }, 5 * 60 * 1000); // 5分钟
};

// 停止健康检查
const stopHealthCheck = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

// 在模块加载时启动健康检查
startHealthCheck();

// 获取当前数据库时区的函数
export async function getCurrentTimezone() {
  try {
    const [rows] = await pool.execute('SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz, NOW() as current_time');
    return rows[0];
  } catch (error) {
    console.error('获取时区信息失败:', error);
    return null;
  }
}

// 验证时区配置的函数
export async function validateTimezone() {
  try {
    const [rows] = await pool.execute('SELECT NOW() as server_time, CONVERT_TZ(NOW(), @@session.time_zone, "+08:00") as beijing_time');
    const serverTime = rows[0].server_time;
    const beijingTime = rows[0].beijing_time;
    
    console.log('服务器时间:', serverTime);
    console.log('北京时间:', beijingTime);
    
    // 检查时间差是否在合理范围内（1分钟内）
    const timeDiff = Math.abs(new Date(serverTime).getTime() - new Date(beijingTime).getTime()) / 1000;
    const isValid = timeDiff < 60;
    
    console.log('时区验证结果:', isValid ? '✅ 时区配置正确' : '❌ 时区配置可能有误');
    return isValid;
  } catch (error) {
    console.error('验证时区失败:', error);
    return false;
  }
}

// 测试数据库连接
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 获取连接池状态信息
export function getPoolStatus() {
  try {
    // 使用公开的属性和配置
    const connectionLimit = dbConfig.connectionLimit;
    
    // 尝试获取连接池统计信息
    let totalConnections = 0;
    let freeConnections = 0;
    
    // 检查连接池的内部状态（这些是私有属性，可能不稳定）
    if (pool.pool) {
      totalConnections = pool.pool._allConnections?.length || 0;
      freeConnections = pool.pool._freeConnections?.length || 0;
    }
    
    const activeConnections = Math.max(0, totalConnections - freeConnections);
    const utilizationRate = connectionLimit > 0 ? Math.round((totalConnections / connectionLimit) * 100) : 0;
    
    return {
      totalConnections,
      freeConnections,
      activeConnections,
      connectionLimit,
      utilizationRate,
      status: 'available'
    };
  } catch (error) {
    console.warn('Unable to get detailed pool status:', error.message);
    return {
      totalConnections: 0,
      freeConnections: 0,
      activeConnections: 0,
      connectionLimit: dbConfig.connectionLimit,
      utilizationRate: 0,
      status: 'unknown'
    };
  }
}

// 创建带有重试机制的查询函数
export async function queryWithRetry(sql, params = [], maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      lastError = error;
      
      // 如果是连接相关的错误，进行重试
      if (
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND'
      ) {
        console.warn(`Database query attempt ${attempt} failed, retrying...`, error.message);
        
        // 指数退避等待
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 非连接错误直接抛出
      throw error;
    }
  }
  
  // 所有重试都失败，抛出最后的错误
  throw lastError;
}

export { pool, startHealthCheck, stopHealthCheck };
export default pool;