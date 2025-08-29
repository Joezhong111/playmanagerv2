#!/usr/bin/env node

/**
 * 手动创建 user_sessions 表的简单脚本
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') );

async function createUserSessionsTable() {
  let connection;
  
  try {
    console.log('🔧 开始创建 user_sessions 表...\n');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'dispatch_system',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined
    });

    console.log('✅ 数据库连接成功');

    // 检查表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'user_sessions'
    `, [process.env.DB_DATABASE]);

    if (tables.length > 0) {
      console.log('✅ user_sessions 表已存在，无需创建');
      return;
    }

    console.log('📝 正在创建 user_sessions 表...');

    // 先创建表（不包含外键）
    await connection.execute(`
      CREATE TABLE user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // 创建索引
    await connection.execute(`
      CREATE INDEX idx_user_id ON user_sessions(user_id)
    `);

    await connection.execute(`
      CREATE INDEX idx_expires_at ON user_sessions(expires_at)
    `);

    await connection.execute(`
      CREATE INDEX idx_is_active ON user_sessions(is_active)
    `);

    console.log('✅ user_sessions 表创建成功');

    // 验证表
    const [verify] = await connection.execute(`
      SELECT COUNT(*) as count FROM user_sessions
    `);

    console.log(`📊 验证成功：user_sessions 表已创建，当前记录数: ${verify[0].count}`);

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行创建脚本
createUserSessionsTable().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});