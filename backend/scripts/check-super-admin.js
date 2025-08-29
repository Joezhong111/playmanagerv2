#!/usr/bin/env node

/**
 * 检查和修复超级管理员账户的脚本
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

async function checkAndFixSuperAdmin() {
  let connection;
  
  try {
    console.log('🔍 检查超级管理员账户...\n');
    
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

    // 检查超级管理员账户
    const [admins] = await connection.execute(
      'SELECT id, username, role, is_active, status FROM users WHERE role = ?',
      ['super_admin']
    );

    console.log('📋 超级管理员账户检查结果:');
    
    if (admins.length === 0) {
      console.log('❌ 未找到超级管理员账户，正在创建...\n');
      
      // 创建超级管理员账户
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, ['super_admin', hashedPassword]);
      
      console.log('✅ 超级管理员账户创建成功');
      console.log('   用户名: super_admin');
      console.log('   密码: admin123');
      console.log('   角色: super_admin');
      
    } else {
      console.log('✅ 找到超级管理员账户:');
      admins.forEach(admin => {
        console.log(`   用户名: ${admin.username}`);
        console.log(`   角色: ${admin.role}`);
        console.log(`   激活状态: ${admin.is_active}`);
        console.log(`   在线状态: ${admin.status}`);
        console.log(`   ID: ${admin.id}`);
        console.log('');
      });
      
      // 检查密码是否正确
      const [passwordCheck] = await connection.execute(
        'SELECT password FROM users WHERE username = ? AND role = ?',
        ['super_admin', 'super_admin']
      );
      
      if (passwordCheck.length > 0) {
        const isPasswordCorrect = await bcrypt.compare('admin123', passwordCheck[0].password);
        console.log(`🔐 密码验证: ${isPasswordCorrect ? '✅ 正确' : '❌ 不正确'}`);
        
        if (!isPasswordCorrect) {
          console.log('🔄 正在重置密码...');
          const newHashedPassword = await bcrypt.hash('admin123', 10);
          await connection.execute(
            'UPDATE users SET password = ? WHERE username = ? AND role = ?',
            [newHashedPassword, 'super_admin', 'super_admin']
          );
          console.log('✅ 密码已重置为: admin123');
        }
      }
    }

    // 检查 user_sessions 表
    console.log('\n🔍 检查 user_sessions 表...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'user_sessions'
    `, [process.env.DB_DATABASE]);

    if (tables.length === 0) {
      console.log('❌ user_sessions 表不存在，正在创建...');
      
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
      console.log('✅ user_sessions 表已存在');
    }

    console.log('\n🎯 现在可以尝试登录了:');
    console.log('   用户名: super_admin');
    console.log('   密码: admin123');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查和修复
checkAndFixSuperAdmin().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});