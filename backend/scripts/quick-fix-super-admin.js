#!/usr/bin/env node

/**
 * 快速修复超级管理员账户的脚本 (不依赖外部包)
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

async function quickFix() {
  let connection;
  
  try {
    console.log('🚀 快速修复超级管理员账户...\n');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'dispatch_system',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? { rejectUnauthorized: true } : undefined
    });

    console.log('✅ 数据库连接成功\n');

    // 删除现有的超级管理员账户（如果有）
    await connection.execute(
      "DELETE FROM users WHERE username = 'super_admin' AND role = 'super_admin'"
    );
    console.log('🗑️  清理现有超级管理员账户');

    // 创建新的超级管理员账户（使用已知的 bcrypt 哈希）
    const bcryptHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    await connection.execute(`
      INSERT INTO users (username, password, role, is_active, status) 
      VALUES ('super_admin', ?, 'super_admin', TRUE, 'idle')
    `, [bcryptHash]);
    
    console.log('✅ 超级管理员账户创建成功');
    console.log('   用户名: super_admin');
    console.log('   密码: admin123');
    console.log('   角色: super_admin');

    // 确保 role 字段支持 super_admin
    try {
      await connection.execute(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player'
      `);
      console.log('✅ role 字段已更新支持 super_admin');
    } catch (error) {
      console.log('ℹ️  role 字段可能已经支持 super_admin');
    }

    // 检查 user_sessions 表
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'user_sessions'
    `, [process.env.DB_DATABASE]);

    if (tables.length === 0) {
      console.log('\n📝 创建 user_sessions 表...');
      await connection.execute(`
        CREATE TABLE user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          INDEX idx_user_id (user_id),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_active (is_active)
        )
      `);
      console.log('✅ user_sessions 表创建成功');
    } else {
      console.log('\n✅ user_sessions 表已存在');
    }

    console.log('\n🎯 修复完成！');
    console.log('   用户名: super_admin');
    console.log('   密码: admin123');
    console.log('\n⚠️  请重启后端服务后尝试登录');

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

// 运行快速修复
quickFix().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});