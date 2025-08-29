#!/usr/bin/env node

/**
 * 数据库管理工具
 * 提供数据库的常用管理功能
 */

import mysql from 'mysql2/promise';
import { getDatabaseConfig, checkDatabaseConfig, logger } from './db-config.js';
import initializeDatabase from './database-setup.js';

async function showHelp() {
  console.log(`
🗄️  数据库管理工具

用法: node db-manager.js <命令>

命令:
  init          - 完整初始化数据库 (创建所有表和初始数据)
  status        - 查看数据库状态和表信息
  reset         - 重置数据库 (删除所有数据，保留表结构)
  clean         - 清理过期会话和数据
  backup        - 创建数据库备份
  help          - 显示帮助信息

示例:
  node db-manager.js init     # 初始化数据库
  node db-manager.js status   # 查看状态
  node db-manager.js reset    # 重置数据库
`);
}

async function showStatus() {
  logger.info('📊 数据库状态检查');
  
  // 显示配置信息
  const { config: dbConfig } = checkDatabaseConfig();
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.success('数据库连接成功');

    // 检查表是否存在
    const tables = [
      'users', 'tasks', 'task_logs', 'user_sessions',
      'time_extension_requests', 'system_statistics', 
      'user_statistics', 'game_names'
    ];

    logger.info('\n📋 表状态检查:');
    for (const table of tables) {
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        logger.success(`${table}: ${count[0].count} 条记录`);
      } catch (error) {
        logger.error(`${table}: 表不存在或无法访问`);
      }
    }

    // 检查超级管理员账户
    try {
      const [admin] = await connection.execute(
        "SELECT username, role, is_active FROM users WHERE role = 'super_admin'"
      );
      if (admin.length > 0) {
        logger.success(`\n🔐 超级管理员: ${admin[0].username} (${admin[0].is_active ? '激活' : '未激活'})`);
      } else {
        logger.warn('\n🔐 未找到超级管理员账户');
      }
    } catch (error) {
      logger.error('\n🔐 无法检查管理员账户');
    }

    // 检查最新任务
    try {
      const [recent] = await connection.execute(
        "SELECT COUNT(*) as count FROM tasks WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)"
      );
      logger.info(`\n📈 最近7天任务: ${recent[0].count} 个`);
    } catch (error) {
      logger.warn('无法获取任务统计');
    }

  } catch (error) {
    logger.error(`连接失败: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function resetDatabase() {
  logger.warn('⚠️  数据库重置操作');
  logger.info('这将清空所有数据，但保留表结构');
  
  const dbConfig = getDatabaseConfig();
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // 禁用外键检查
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'user_statistics', 'system_statistics', 'time_extension_requests',
      'task_logs', 'tasks', 'user_sessions', 'users', 'game_names'
    ];

    for (const table of tables) {
      try {
        await connection.execute(`TRUNCATE TABLE ${table}`);
        logger.success(`清空表: ${table}`);
      } catch (error) {
        logger.warn(`清空表 ${table} 失败: ${error.message}`);
      }
    }

    // 重新启用外键检查
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    logger.success('数据库重置完成');
    logger.info('请运行 "node db-manager.js init" 重新初始化数据');

  } catch (error) {
    logger.error(`重置失败: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function cleanDatabase() {
  logger.info('🧹 数据库清理');
  
  const dbConfig = getDatabaseConfig();
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // 清理过期会话
    const [expired] = await connection.execute(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    logger.success(`清理过期会话: ${expired.affectedRows} 条`);

    // 清理旧的日志（超过30天）
    const [oldLogs] = await connection.execute(
      'DELETE FROM task_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    logger.success(`清理旧日志: ${oldLogs.affectedRows} 条`);

    // 更新离线用户状态
    const [offline] = await connection.execute(`
      UPDATE users u
      LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
      SET u.status = 'offline'
      WHERE u.role = 'player' AND s.id IS NULL AND u.status != 'offline'
    `);
    logger.success(`更新离线状态: ${offline.affectedRows} 个用户`);

    logger.success('数据库清理完成');

  } catch (error) {
    logger.error(`清理失败: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 主程序
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      await initializeDatabase();
      break;
    
    case 'status':
      await showStatus();
      break;
    
    case 'reset':
      await resetDatabase();
      break;
    
    case 'clean':
      await cleanDatabase();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      await showHelp();
      break;
    
    default:
      console.log('❌ 未知命令，使用 "node db-manager.js help" 查看帮助');
      process.exit(1);
  }
}

// 检查是否是直接运行这个脚本
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(error => {
    logger.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
} else if (!process.argv[1] || process.argv[1].includes('db-manager.js')) {
  // 直接运行的情况
  main().catch(error => {
    logger.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
}