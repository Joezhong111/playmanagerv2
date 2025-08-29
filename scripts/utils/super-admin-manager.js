#!/usr/bin/env node

/**
 * 超级管理员账户管理工具
 * 提供创建、激活、重置密码等功能
 */

import { pool } from './config/database.js';
import bcrypt from 'bcrypt';
import { TEST_USERS, logger, colors, symbols } from './tools.js';

class SuperAdminManager {
  constructor() {
    this.config = TEST_USERS.SUPER_ADMIN;
  }

  async create() {
    logger.info('🔧 创建超级管理员账户...');

    try {
      // 检查是否已存在
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ? AND role = ?',
        [this.config.username, this.config.role]
      );

      if (existing.length > 0) {
        logger.warn('超级管理员账户已存在');
        return false;
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(this.config.password, saltRounds);

      // 创建账户
      await pool.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, [this.config.username, hashedPassword, this.config.role]);

      logger.success('超级管理员账户创建成功');
      logger.info(`   用户名: ${this.config.username}`);
      logger.info(`   密码: ${this.config.password}`);
      return true;

    } catch (error) {
      logger.error('创建超级管理员账户失败:', error);
      return false;
    }
  }

  async activate() {
    logger.info('🔧 激活超级管理员账户...');

    try {
      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(this.config.password, saltRounds);

      // 更新账户
      const [result] = await pool.execute(`
        UPDATE users 
        SET password = ?, is_active = TRUE, status = 'idle' 
        WHERE username = ? AND role = ?
      `, [hashedPassword, this.config.username, this.config.role]);

      if (result.affectedRows > 0) {
        logger.success('超级管理员账户已激活');
        logger.info(`   用户名: ${this.config.username}`);
        logger.info(`   密码: ${this.config.password}`);
        return true;
      } else {
        logger.warn('未找到超级管理员账户');
        return false;
      }

    } catch (error) {
      logger.error('激活超级管理员账户失败:', error);
      return false;
    }
  }

  async resetPassword(newPassword = this.config.password) {
    logger.info('🔧 重置超级管理员密码...');

    try {
      // 加密新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 更新密码
      const [result] = await pool.execute(`
        UPDATE users 
        SET password = ? 
        WHERE username = ? AND role = ?
      `, [hashedPassword, this.config.username, this.config.role]);

      if (result.affectedRows > 0) {
        logger.success('超级管理员密码重置成功');
        logger.info(`   用户名: ${this.config.username}`);
        logger.info(`   新密码: ${newPassword}`);
        return true;
      } else {
        logger.warn('未找到超级管理员账户');
        return false;
      }

    } catch (error) {
      logger.error('重置超级管理员密码失败:', error);
      return false;
    }
  }

  async showStatus() {
    logger.info('📋 查看超级管理员账户状态...');

    try {
      const [users] = await pool.execute(
        'SELECT username, role, is_active, status, created_at, last_login_at FROM users WHERE username = ? AND role = ?',
        [this.config.username, this.config.role]
      );

      if (users.length > 0) {
        const user = users[0];
        logger.info('账户信息:');
        logger.info(`   用户名: ${user.username}`);
        logger.info(`   角色: ${user.role}`);
        logger.info(`   激活状态: ${user.is_active ? '已激活' : '未激活'}`);
        logger.info(`   当前状态: ${user.status}`);
        logger.info(`   创建时间: ${user.created_at}`);
        logger.info(`   最后登录: ${user.last_login_at || '从未登录'}`);
        return user;
      } else {
        logger.warn('未找到超级管理员账户');
        return null;
      }

    } catch (error) {
      logger.error('查看超级管理员账户状态失败:', error);
      return null;
    }
  }

  async ensureExists() {
    logger.info('🔧 确保超级管理员账户存在...');

    const status = await this.showStatus();
    
    if (!status) {
      logger.info('创建新的超级管理员账户...');
      return await this.create();
    } else if (!status.is_active) {
      logger.info('激活超级管理员账户...');
      return await this.activate();
    } else {
      logger.success('超级管理员账户状态正常');
      return true;
    }
  }

  async cleanup() {
    await pool.end();
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const manager = new SuperAdminManager();

  try {
    switch (command) {
      case 'create':
        await manager.create();
        break;
      case 'activate':
        await manager.activate();
        break;
      case 'reset':
        const newPassword = args[1] || TEST_USERS.SUPER_ADMIN.password;
        await manager.resetPassword(newPassword);
        break;
      case 'status':
        await manager.showStatus();
        break;
      case 'ensure':
        await manager.ensureExists();
        break;
      default:
        logger.info('使用方法: node super-admin-manager.js [command]');
        logger.info('命令:');
        logger.info('  create    - 创建超级管理员账户');
        logger.info('  activate  - 激活超级管理员账户');
        logger.info('  reset     - 重置超级管理员密码');
        logger.info('  status    - 查看账户状态');
        logger.info('  ensure    - 确保账户存在并激活');
        break;
    }
  } catch (error) {
    logger.error('执行失败:', error);
  } finally {
    await manager.cleanup();
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SuperAdminManager;