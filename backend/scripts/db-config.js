/**
 * 数据库配置工具
 * 提供智能的SSL配置和连接管理
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * 智能SSL配置检测
 * @param {string} host - 数据库主机地址
 * @param {string|number} port - 数据库端口
 * @param {string} sslConfig - SSL配置 (auto/true/false)
 * @returns {object|undefined} SSL配置对象或undefined
 */
function getSSLConfig(host, port, sslConfig) {
  // 如果明确禁用SSL
  if (sslConfig === 'false' || sslConfig === false) {
    return undefined;
  }
  
  // 如果明确启用SSL
  if (sslConfig === 'true' || sslConfig === true) {
    return { rejectUnauthorized: false };
  }
  
  // 自动检测模式 (default)
  const needsSSL = 
    // 云数据库服务商
    host.includes('tidbcloud.com') ||
    host.includes('planetscale.com') ||
    host.includes('aws.amazon.com') ||
    host.includes('rds.amazonaws.com') ||
    host.includes('database.azure.com') ||
    host.includes('googleapis.com') ||
    host.includes('digitalocean.com') ||
    
    // 常见的SSL端口
    port == 3307 || port == 25060 ||
    
    // HTTPS端口
    port == 443;
  
  return needsSSL ? { rejectUnauthorized: false } : undefined;
}

/**
 * 获取完整的数据库配置
 * @returns {object} 数据库配置对象
 */
export function getDatabaseConfig() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const sslConfig = process.env.DB_SSL || 'auto';
  
  const config = {
    host,
    port: parseInt(port),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'dispatch_system',
    connectTimeout: 30000,
    charset: 'utf8mb4'
  };
  
  // 添加SSL配置
  const ssl = getSSLConfig(host, port, sslConfig);
  if (ssl) {
    config.ssl = ssl;
  }
  
  return config;
}

/**
 * 检查数据库配置并显示信息
 * @returns {object} 数据库配置和检测信息
 */
export function checkDatabaseConfig() {
  const config = getDatabaseConfig();
  const info = {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    ssl: !!config.ssl,
    sslMode: process.env.DB_SSL || 'auto'
  };
  
  console.log('📊 数据库配置信息:');
  console.log(`   主机: ${info.host}:${info.port}`);
  console.log(`   用户: ${info.user}`);
  console.log(`   数据库: ${info.database}`);
  console.log(`   SSL: ${info.ssl ? '启用' : '禁用'} (模式: ${info.sslMode})`);
  
  if (info.ssl) {
    console.log('   🔒 检测到需要SSL连接');
  } else {
    console.log('   🔓 使用普通连接');
  }
  
  return { config, info };
}

// 日志工具
export const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  step: (num, msg) => console.log(`\n${num}️⃣  ${msg}`)
};

export default getDatabaseConfig;