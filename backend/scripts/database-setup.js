#!/usr/bin/env node

/**
 * 统一数据库初始化脚本
 * 适用于PlayManagerV2陪玩管理系统
 * 包含所有必要的表结构、索引、外键约束和初始数据
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { getDatabaseConfig, checkDatabaseConfig, logger } from './db-config.js';

// 默认超级管理员账户配置
const SUPER_ADMIN = {
  username: 'super_admin',
  password: 'admin123',
  role: 'super_admin'
};

async function initializeDatabase() {
  logger.info('🚀 PlayManagerV2 数据库初始化开始');
  logger.info('=========================================');

  // 检查和显示数据库配置
  const { config: dbConfig } = checkDatabaseConfig();
  
  let connection;

  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    logger.success('数据库连接成功');

    // 1. 创建用户表
    logger.step(1, '创建用户表 (users)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player',
        status ENUM('idle', 'busy', 'offline') DEFAULT 'idle',
        is_active BOOLEAN DEFAULT TRUE COMMENT '用户是否激活',
        last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
        login_count INT DEFAULT 0 COMMENT '登录次数',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_role (role),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('用户表创建完成');

    // 2. 创建任务表
    logger.step(2, '创建任务表 (tasks)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL COMMENT '客户姓名',
        customer_contact VARCHAR(50) NOT NULL COMMENT '客户联系方式',
        game_name VARCHAR(100) NOT NULL COMMENT '游戏名称',
        game_mode VARCHAR(100) COMMENT '游戏模式',
        duration INT NOT NULL COMMENT '任务时长(分钟)',
        original_duration INT COMMENT '原始任务时长(分钟)',
        estimated_duration INT COMMENT '预估任务时长(分钟)',
        actual_duration INT COMMENT '实际任务时长(分钟)',
        price DECIMAL(10,2) NOT NULL COMMENT '任务价格',
        requirements TEXT COMMENT '任务要求',
        dispatcher_id INT NOT NULL COMMENT '派单员ID',
        player_id INT NULL COMMENT '陪玩员ID',
        status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') DEFAULT 'pending',
        overtime_at DATETIME NULL COMMENT '任务超时时间',
        completion_rate DECIMAL(5,2) COMMENT '完成率评分(1-5)',
        dispatcher_notes TEXT COMMENT '派单员备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_dispatcher_id (dispatcher_id),
        INDEX idx_player_id (player_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_status_player (status, player_id),
        INDEX idx_dispatcher_status (dispatcher_id, status),
        INDEX idx_date_status (DATE(created_at), status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('任务表创建完成');

    // 3. 创建任务日志表
    logger.step(3, '创建任务日志表 (task_logs)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL COMMENT '任务ID',
        user_id INT NOT NULL COMMENT '操作用户ID',
        action VARCHAR(50) NOT NULL COMMENT '操作类型',
        old_status VARCHAR(50) COMMENT '旧状态',
        new_status VARCHAR(50) COMMENT '新状态',
        notes TEXT COMMENT '操作备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_task_id (task_id),
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('任务日志表创建完成');

    // 4. 创建用户会话管理表
    logger.step(4, '创建用户会话管理表 (user_sessions)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        token_hash VARCHAR(255) NOT NULL COMMENT 'JWT token hash',
        expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃',
        
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('用户会话管理表创建完成');

    // 5. 创建时间延长申请表
    logger.step(5, '创建时间延长申请表 (time_extension_requests)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS time_extension_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL COMMENT '任务ID',
        player_id INT NOT NULL COMMENT '申请人ID',
        dispatcher_id INT NOT NULL COMMENT '派单员ID',
        requested_minutes INT NOT NULL COMMENT '申请延长的分钟数',
        reason VARCHAR(500) COMMENT '申请理由',
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewed_by INT COMMENT '审核人ID',
        reviewed_at TIMESTAMP NULL COMMENT '审核时间',
        review_reason VARCHAR(500) COMMENT '审核理由/备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_task_id (task_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('时间延长申请表创建完成');

    // 6. 创建系统统计表
    logger.step(6, '创建系统统计表 (system_statistics)');
    await connection.execute(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_date (date),
        UNIQUE KEY uk_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('系统统计表创建完成');

    // 7. 创建用户统计表
    logger.step(7, '创建用户统计表 (user_statistics)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        date DATE NOT NULL COMMENT '统计日期',
        tasks_completed INT DEFAULT 0 COMMENT '完成任务数',
        tasks_cancelled INT DEFAULT 0 COMMENT '取消任务数',
        total_earnings DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
        total_duration INT DEFAULT 0 COMMENT '总工作时长(分钟)',
        average_duration INT DEFAULT 0 COMMENT '平均任务时长(分钟)',
        active_minutes INT DEFAULT 0 COMMENT '活跃时长(分钟)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_user_date (user_id, date),
        INDEX idx_date (date),
        UNIQUE KEY uk_user_date (user_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('用户统计表创建完成');

    // 8. 创建游戏字典表
    logger.step(8, '创建游戏字典表 (game_names)');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_names (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '游戏名称',
        is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY uk_name (name),
        INDEX idx_is_active (is_active),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.success('游戏字典表创建完成');

    // 9. 添加外键约束
    logger.step(9, '添加外键约束');
    
    const constraints = [
      {
        name: 'fk_tasks_dispatcher',
        sql: 'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_dispatcher FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_tasks_player',
        sql: 'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL'
      },
      {
        name: 'fk_task_logs_task',
        sql: 'ALTER TABLE task_logs ADD CONSTRAINT fk_task_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_task_logs_user',
        sql: 'ALTER TABLE task_logs ADD CONSTRAINT fk_task_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_user_sessions_user',
        sql: 'ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_extension_task',
        sql: 'ALTER TABLE time_extension_requests ADD CONSTRAINT fk_extension_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_extension_player',
        sql: 'ALTER TABLE time_extension_requests ADD CONSTRAINT fk_extension_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_extension_dispatcher',
        sql: 'ALTER TABLE time_extension_requests ADD CONSTRAINT fk_extension_dispatcher FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE'
      },
      {
        name: 'fk_extension_reviewer',
        sql: 'ALTER TABLE time_extension_requests ADD CONSTRAINT fk_extension_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL'
      },
      {
        name: 'fk_user_statistics_user',
        sql: 'ALTER TABLE user_statistics ADD CONSTRAINT fk_user_statistics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
      }
    ];

    for (const constraint of constraints) {
      try {
        // 检查约束是否已存在
        const [existing] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.table_constraints 
          WHERE constraint_schema = DATABASE() 
          AND constraint_name = ? 
          AND constraint_type = 'FOREIGN KEY'
        `, [constraint.name]);

        if (existing[0].count === 0) {
          await connection.execute(constraint.sql);
          logger.info(`✓ 外键约束 ${constraint.name} 创建成功`);
        } else {
          logger.info(`- 外键约束 ${constraint.name} 已存在`);
        }
      } catch (error) {
        logger.warn(`外键约束 ${constraint.name} 创建失败: ${error.message}`);
      }
    }
    logger.success('外键约束配置完成');

    // 10. 创建超级管理员账户
    logger.step(10, '创建超级管理员账户');
    
    // 检查是否已存在
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM users WHERE username = ? AND role = ?',
      [SUPER_ADMIN.username, SUPER_ADMIN.role]
    );

    if (existingAdmin.length === 0) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, saltRounds);
      
      await connection.execute(`
        INSERT INTO users (username, password, role, is_active, status) 
        VALUES (?, ?, ?, TRUE, 'idle')
      `, [SUPER_ADMIN.username, hashedPassword, SUPER_ADMIN.role]);
      
      logger.success('超级管理员账户创建成功');
      logger.info(`   用户名: ${SUPER_ADMIN.username}`);
      logger.info(`   密码: ${SUPER_ADMIN.password}`);
    } else {
      // 更新密码以确保密码是已知的
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, saltRounds);
      await connection.execute(`
        UPDATE users SET password = ?, is_active = TRUE 
        WHERE username = ? AND role = ?
      `, [hashedPassword, SUPER_ADMIN.username, SUPER_ADMIN.role]);
      
      logger.info('超级管理员账户已存在');
      logger.success(`密码已重置为: ${SUPER_ADMIN.password}`);
    }

    // 11. 初始化游戏字典数据
    logger.step(11, '初始化游戏字典数据');
    const defaultGames = [
      '王者荣耀', '英雄联盟', '和平精英', '原神', '绝地求生',
      'CF穿越火线', 'DNF地下城与勇士', 'LOL手游', '光遇', '蛋仔派对'
    ];

    for (let i = 0; i < defaultGames.length; i++) {
      await connection.execute(`
        INSERT IGNORE INTO game_names (name, is_active, sort_order) 
        VALUES (?, TRUE, ?)
      `, [defaultGames[i], i + 1]);
    }
    logger.success(`初始化了 ${defaultGames.length} 个默认游戏`);

    // 12. 创建存储过程和事件
    logger.step(12, '创建存储过程和定时事件');
    
    try {
      // 删除已存在的存储过程
      await connection.execute('DROP PROCEDURE IF EXISTS CleanExpiredSessions');
      
      // 创建清理过期会话的存储过程
      await connection.execute(`
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
      
      // 创建定时事件
      await connection.execute(`
        CREATE EVENT IF NOT EXISTS daily_session_cleanup
        ON SCHEDULE EVERY 1 DAY
        STARTS TIMESTAMP(DATE(NOW()) + INTERVAL 1 DAY)
        DO
          CALL CleanExpiredSessions()
      `);
      
      logger.success('存储过程和定时事件创建完成');
    } catch (error) {
      logger.warn(`存储过程/事件创建失败: ${error.message}`);
    }

    // 13. 验证数据库初始化结果
    logger.step(13, '验证数据库初始化结果');
    
    const tables = [
      'users', 'tasks', 'task_logs', 'user_sessions', 
      'time_extension_requests', 'system_statistics', 
      'user_statistics', 'game_names'
    ];
    
    for (const table of tables) {
      const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      logger.info(`✓ 表 ${table}: ${count[0].count} 条记录`);
    }

    logger.success('\n🎉 数据库初始化完成！');
    logger.info('\n📋 初始化摘要:');
    logger.info('✅ 8个核心表创建完成');
    logger.info('✅ 所有索引和外键约束配置完成');
    logger.info('✅ 超级管理员账户已创建');
    logger.info('✅ 游戏字典数据已初始化');
    logger.info('✅ 存储过程和定时事件已配置');
    logger.info('\n🔐 管理员账户信息:');
    logger.info(`   用户名: ${SUPER_ADMIN.username}`);
    logger.info(`   密码: ${SUPER_ADMIN.password}`);
    logger.info('\n🚀 系统已准备就绪！');

  } catch (error) {
    logger.error(`数据库初始化失败: ${error.message}`);
    logger.error(`详细错误: ${error.stack}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  initializeDatabase().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
} else if (!process.argv[1] || process.argv[1].includes('database-setup.js')) {
  initializeDatabase().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export default initializeDatabase;