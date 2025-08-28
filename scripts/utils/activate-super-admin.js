#!/usr/bin/env node

/**
 * 激活超级管理员账户
 */

import { pool } from './config/database.js';
import bcrypt from 'bcrypt';

async function activateSuperAdmin() {
  console.log('🔧 激活超级管理员账户...\n');

  try {
    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    // 更新超级管理员账户
    const [result] = await pool.execute(`
      UPDATE users 
      SET password = ?, is_active = TRUE, status = 'idle' 
      WHERE username = ? AND role = ?
    `, [hashedPassword, 'super_admin', 'super_admin']);

    if (result.affectedRows > 0) {
      console.log('✅ 超级管理员账户已激活');
      console.log('   用户名: super_admin');
      console.log('   密码: admin123');
    } else {
      console.log('❌ 未找到超级管理员账户，正在创建...');
      
      // 创建新账户
      await pool.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, ['super_admin', hashedPassword, 'super_admin']);
      
      console.log('✅ 超级管理员账户已创建');
      console.log('   用户名: super_admin');
      console.log('   密码: admin123');
    }

    // 验证账户
    const [users] = await pool.execute(
      'SELECT username, role, is_active, status FROM users WHERE username = ? AND role = ?',
      ['super_admin', 'super_admin']
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('\n📋 账户信息:');
      console.log(`   用户名: ${user.username}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   激活状态: ${user.is_active}`);
      console.log(`   当前状态: ${user.status}`);
    }

  } catch (error) {
    console.error('❌ 激活失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行激活脚本
activateSuperAdmin().catch(console.error);