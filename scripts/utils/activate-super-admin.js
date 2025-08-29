#!/usr/bin/env node

/**
 * 激活超级管理员账户
 * 使用统一的配置和工具库
 */

import { pool } from './config/database.js';
import bcrypt from 'bcrypt';
import { TEST_USERS, logger, colors, symbols } from './tools.js';

async function activateSuperAdmin() {
  logger.info('🔧 激活超级管理员账户...\n');

  try {
    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(TEST_USERS.SUPER_ADMIN.password, saltRounds);
    
    // 更新超级管理员账户
    const [result] = await pool.execute(`
      UPDATE users 
      SET password = ?, is_active = TRUE, status = 'idle' 
      WHERE username = ? AND role = ?
    `, [hashedPassword, TEST_USERS.SUPER_ADMIN.username, TEST_USERS.SUPER_ADMIN.role]);

    if (result.affectedRows > 0) {
      logger.success('超级管理员账户已激活');
      logger.info(`   用户名: ${TEST_USERS.SUPER_ADMIN.username}`);
      logger.info(`   密码: ${TEST_USERS.SUPER_ADMIN.password}`);
    } else {
      logger.warn('未找到超级管理员账户，正在创建...');
      
      // 创建新账户
      await pool.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, [TEST_USERS.SUPER_ADMIN.username, hashedPassword, TEST_USERS.SUPER_ADMIN.role]);
      
      logger.success('超级管理员账户已创建');
      logger.info(`   用户名: ${TEST_USERS.SUPER_ADMIN.username}`);
      logger.info(`   密码: ${TEST_USERS.SUPER_ADMIN.password}`);
    }

    // 验证账户
    const [users] = await pool.execute(
      'SELECT username, role, is_active, status FROM users WHERE username = ? AND role = ?',
      [TEST_USERS.SUPER_ADMIN.username, TEST_USERS.SUPER_ADMIN.role]
    );

    if (users.length > 0) {
      const user = users[0];
      logger.info('\n📋 账户信息:');
      logger.info(`   用户名: ${user.username}`);
      logger.info(`   角色: ${user.role}`);
      logger.info(`   激活状态: ${user.is_active}`);
      logger.info(`   当前状态: ${user.status}`);
    }

  } catch (error) {
    logger.error('激活失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行激活脚本
activateSuperAdmin().catch(console.error);