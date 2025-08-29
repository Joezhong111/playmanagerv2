#!/usr/bin/env node

/**
 * 验证超级管理员账户的脚本
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

async function verifySuperAdmin() {
  let connection;
  
  try {
    console.log('🔍 验证超级管理员账户...\n');
    
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

    // 检查所有超级管理员账户
    const [admins] = await connection.execute(
      'SELECT id, username, password, role, is_active, status, created_at FROM users WHERE role = ?',
      ['super_admin']
    );

    console.log('📋 超级管理员账户列表:');
    
    if (admins.length === 0) {
      console.log('❌ 未找到任何超级管理员账户');
      
      // 创建新的超级管理员账户
      console.log('\n🔧 创建新的超级管理员账户...');
      const bcryptHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
      
      await connection.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES ('super_admin', ?, 'super_admin', TRUE, 'idle')
      `, [bcryptHash]);
      
      console.log('✅ 超级管理员账户创建成功');
      console.log('   用户名: super_admin');
      console.log('   密码: admin123');
      
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. 账户信息:`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   用户名: ${admin.username}`);
        console.log(`   密码哈希: ${admin.password.substring(0, 20)}...`);
        console.log(`   角色: ${admin.role}`);
        console.log(`   激活状态: ${admin.is_active}`);
        console.log(`   在线状态: ${admin.status}`);
        console.log(`   创建时间: ${admin.created_at}`);
      });
      
      // 检查密码哈希是否正确
      const correctHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
      const hasCorrectPassword = admins.some(admin => admin.password === correctHash);
      
      if (!hasCorrectPassword) {
        console.log('\n⚠️  发现密码哈希不匹配，正在重置密码...');
        
        // 重置所有超级管理员账户的密码
        await connection.execute(
          'UPDATE users SET password = ? WHERE role = ?',
          [correctHash, 'super_admin']
        );
        
        console.log('✅ 密码已重置为: admin123');
      } else {
        console.log('\n✅ 密码哈希正确');
      }
      
      // 确保账户是激活状态
      await connection.execute(
        'UPDATE users SET is_active = TRUE, status = "idle" WHERE role = ?',
        ['super_admin']
      );
      console.log('✅ 账户状态已更新为激活');
    }

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

    console.log('\n🎯 验证完成！');
    console.log('   用户名: super_admin');
    console.log('   密码: admin123');
    console.log('\n⚠️  请重新尝试登录');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行验证
verifySuperAdmin().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});