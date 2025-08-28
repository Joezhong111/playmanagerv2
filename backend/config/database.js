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
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 在每个连接建立时设置时区
let connectionCount = 0;
pool.on('connection', function (connection) {
  connection.query("SET time_zone = '+08:00'");
  connection.query("SET names utf8mb4");
  connectionCount++;
  if (connectionCount <= 1 || process.env.NODE_ENV === 'development') {
    console.log(`数据库连接已设置时区: +08:00 (北京时间) [连接数: ${connectionCount}]`);
  }
});

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

export { pool };
export default pool;