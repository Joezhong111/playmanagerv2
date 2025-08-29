#!/usr/bin/env node

/**
 * 快速修复 user_sessions 表的脚本
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

async function fixUserSessionsTable() {
  let connection;
  
  try {
    console.log('🔧 开始修复 user_sessions 表...\n');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'dispatch_system',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined,
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功\n');

    // 检查 user_sessions 表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'user_sessions'
    `, [process.env.DB_DATABASE]);

    if (tables.length > 0) {
      console.log('✅ user_sessions 表已存在');
      return;
    }

    console.log('❌ user_sessions 表不存在，正在创建...\n');

    // 创建 user_sessions 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL COMMENT 'JWT token hash',
        expires_at TIMESTAMP NOT NULL COMMENT 'Expiration time',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active),
        
        CONSTRAINT fk_user_sessions_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ user_sessions 表创建成功\n');

    // 验证表是否创建成功
    const [verifyTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'user_sessions'
    `, [process.env.DB_DATABASE]);

    if (verifyTables.length > 0) {
      console.log('✅ 验证成功：user_sessions 表已创建');
    } else {
      console.log('❌ 验证失败：user_sessions 表创建失败');
    }

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行修复
fixUserSessionsTable().catch(error => {
  console.error('修复脚本执行失败:', error);
  process.exit(1);
});