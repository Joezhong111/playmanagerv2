#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 创建超级管理员账户和必要的表结构
 */

import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';
import { TEST_USERS, logger } from './tools.js';

async function initializeDatabase() {
  logger.info('🗄️ 开始初始化数据库...\n');

  try {
    // 1. 检查并更新users表结构
    logger.info('1️⃣ 检查users表结构...');
    
    try {
      await pool.execute(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player'
      `);
      logger.success('users表角色字段已更新');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        logger.info('users表结构已是最新的');
      } else {
        throw error;
      }
    }

    // 2. 添加用户状态管理字段
    logger.info('\n2️⃣ 添加用户状态管理字段...');
    
    try {
      // 分别添加字段，避免IF NOT EXISTS语法问题
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE COMMENT '用户是否激活' AFTER status
      `);
      logger.success('is_active字段已添加');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        logger.info('is_active字段已存在');
      } else {
        logger.warn('is_active字段添加失败:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN last_login_at TIMESTAMP NULL COMMENT '最后登录时间' AFTER is_active
      `);
      logger.success('last_login_at字段已添加');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        logger.info('last_login_at字段已存在');
      } else {
        logger.warn('last_login_at字段添加失败:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN login_count INT DEFAULT 0 COMMENT '登录次数' AFTER last_login_at
      `);
      logger.success('login_count字段已添加');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        logger.info('login_count字段已存在');
      } else {
        logger.warn('login_count字段添加失败:', error.message);
      }
    }

    // 3. 创建用户会话管理表
    logger.info('\n3️⃣ 创建用户会话管理表...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL COMMENT 'JWT token hash',
        expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active)
      )
    `);
    logger.success('用户会话管理表已创建');

    // 4. 创建系统统计汇总表
    logger.info('\n4️⃣ 创建系统统计汇总表...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL COMMENT '统计日期',
        total_users INT DEFAULT 0 COMMENT '总用户数',
        active_users INT DEFAULT 0 COMMENT '活跃用户数',
        total_tasks INT DEFAULT 0 COMMENT '总任务数',
        completed_tasks INT DEFAULT 0 COMMENT '完成任务数',
        cancelled_tasks INT DEFAULT 0 COMMENT '取消任务数',
        total_revenue DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
        average_task_duration INT DEFAULT 0 COMMENT '平均任务时长(分钟)',
        peak_active_players INT DEFAULT 0 COMMENT '峰值活跃陪玩员',
        peak_active_tasks INT DEFAULT 0 COMMENT '峰值进行中任务',
        
        INDEX idx_date (date),
        UNIQUE KEY uk_date (date)
      )
    `);
    logger.success('系统统计汇总表已创建');

    // 5. 创建用户统计表
    logger.info('\n5️⃣ 创建用户统计表...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL COMMENT '统计日期',
        tasks_completed INT DEFAULT 0 COMMENT '完成任务数',
        tasks_cancelled INT DEFAULT 0 COMMENT '取消任务数',
        total_earnings DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
        total_duration INT DEFAULT 0 COMMENT '总工作时长(分钟)',
        average_duration INT DEFAULT 0 COMMENT '平均任务时长(分钟)',
        active_minutes INT DEFAULT 0 COMMENT '活跃时长(分钟)',
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_user_date (user_id, date),
        INDEX idx_date (date),
        UNIQUE KEY uk_user_date (user_id, date)
      )
    `);
    logger.success('用户统计表已创建');

    // 6. 添加任务相关字段
    logger.info('\n6️⃣ 添加任务相关字段...');
    
    try {
      await pool.execute(`
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS estimated_duration INT COMMENT '预估任务时长(分钟)' AFTER duration,
        ADD COLUMN IF NOT EXISTS actual_duration INT COMMENT '实际任务时长(分钟)' AFTER estimated_duration,
        ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) COMMENT '完成率评分(1-5)' AFTER actual_duration,
        ADD COLUMN IF NOT EXISTS dispatcher_notes TEXT COMMENT '派单员备注' AFTER completion_rate
      `);
      
      // 为已有任务设置默认值
      await pool.execute(`
        UPDATE tasks SET estimated_duration = duration WHERE estimated_duration IS NULL
      `);
      
      logger.success('任务相关字段已添加');
    } catch (error) {
      logger.info('任务相关字段已存在');
    }

    // 7. 添加索引优化查询性能
    logger.info('\n7️⃣ 添加索引优化查询性能...');
    
    try {
      await pool.execute(`ALTER TABLE tasks ADD INDEX idx_created_status (created_at, status)`);
      await pool.execute(`ALTER TABLE tasks ADD INDEX idx_player_status (player_id, status)`);
      await pool.execute(`ALTER TABLE tasks ADD INDEX idx_date_status (DATE(created_at), status)`);
      logger.success('索引优化已完成');
    } catch (error) {
      logger.info('索引已存在');
    }

    // 8. 创建超级管理员账户
    logger.info('\n8️⃣ 创建超级管理员账户...');
    
    // 检查是否已存在超级管理员账户
    const [existingAdmin] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND role = ?',
      [TEST_USERS.SUPER_ADMIN.username, TEST_USERS.SUPER_ADMIN.role]
    );

    if (existingAdmin.length === 0) {
      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(TEST_USERS.SUPER_ADMIN.password, saltRounds);
      
      await pool.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, [TEST_USERS.SUPER_ADMIN.username, hashedPassword, TEST_USERS.SUPER_ADMIN.role]);
      
      logger.success('超级管理员账户已创建');
      logger.info(`   用户名: ${TEST_USERS.SUPER_ADMIN.username}`);
      logger.info(`   密码: ${TEST_USERS.SUPER_ADMIN.password}`);
    } else {
      logger.info('超级管理员账户已存在');
      
      // 更新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(TEST_USERS.SUPER_ADMIN.password, saltRounds);
      await pool.execute(`
        UPDATE users SET password = ? WHERE username = ? AND role = ?
      `, [hashedPassword, TEST_USERS.SUPER_ADMIN.username, TEST_USERS.SUPER_ADMIN.role]);
      
      logger.success(`超级管理员密码已更新为: ${TEST_USERS.SUPER_ADMIN.password}`);
    }

    // 9. 创建存储过程
    logger.info('\n9️⃣ 创建存储过程...');
    
    try {
      await pool.execute(`
        DROP PROCEDURE IF EXISTS CleanExpiredSessions
      `);
      
      await pool.execute(`
        CREATE PROCEDURE CleanExpiredSessions()
        BEGIN
          -- 标记过期会话为非活跃
          UPDATE user_sessions 
          SET is_active = FALSE 
          WHERE expires_at < NOW();
          
          -- 删除30天前的非活跃会话记录
          DELETE FROM user_sessions 
          WHERE is_active = FALSE AND last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY);
          
          -- 更新离线用户状态
          UPDATE users u
          LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
          SET u.status = 'offline'
          WHERE u.role = 'player' AND s.id IS NULL AND u.status != 'offline';
        END
      `);
      
      logger.success('存储过程已创建');
    } catch (error) {
      logger.info('存储过程创建失败或已存在');
    }

    // 10. 创建事件
    logger.info('\n🔟 创建定时事件...');
    
    try {
      await pool.execute(`
        CREATE EVENT IF NOT EXISTS daily_session_cleanup
        ON SCHEDULE EVERY 1 DAY
        STARTS TIMESTAMP(DATE(NOW()) + INTERVAL 1 DAY)
        DO
          CALL CleanExpiredSessions()
      `);
      
      logger.success('定时事件已创建');
    } catch (error) {
      logger.info('定时事件创建失败或已存在');
    }

    logger.success('\n🎉 数据库初始化完成！');
    logger.info('\n📋 账户信息:');
    logger.info(`   超级管理员: ${TEST_USERS.SUPER_ADMIN.username} / ${TEST_USERS.SUPER_ADMIN.password}`);
    
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行初始化
initializeDatabase().catch(error => {
  logger.error('初始化脚本执行失败:', error);
  process.exit(1);
});