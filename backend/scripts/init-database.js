#!/usr/bin/env node

/**
 * 数据库完整初始化脚本
 * 按正确顺序运行所有migration文件
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// 加载环境变量
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志工具
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`)
};

// 迁移文件列表（按依赖顺序排列）
const migrations = [
  {
    name: 'super_admin_features',
    file: 'add_super_admin_features.sql',
    description: '创建超级管理员功能和基础表结构'
  },
  {
    name: 'task_queue_system', 
    file: 'add_task_queue_system.sql',
    description: '添加任务队列系统'
  },
  {
    name: 'time_extension_features',
    file: 'add_time_extension_features.sql', 
    description: '添加时间延长功能'
  },
  {
    name: 'overtime_functionality',
    file: 'add_overtime_functionality.sql',
    description: '添加超时检测功能'
  },
  {
    name: 'game_dictionary',
    file: 'add_game_dictionary.sql',
    description: '添加游戏字典系统'
  }
];

async function initializeDatabase() {
  let connection;
  
  try {
    logger.info('🚀 开始初始化数据库...\n');
    
    // 显示数据库连接信息（隐藏敏感信息）
    logger.info('📊 数据库连接配置:');
    logger.info(`   主机: ${process.env.DB_HOST || 'localhost'}`);
    logger.info(`   端口: ${process.env.DB_PORT || 3306}`);
    logger.info(`   数据库: ${process.env.DB_DATABASE || 'dispatch_system'}`);
    logger.info(`   用户: ${process.env.DB_USERNAME || 'root'}`);
    console.log('');

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

    logger.success('数据库连接成功');
    console.log('');

    // 检查基础表是否存在
    logger.info('🔍 检查基础表结构...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name IN ('users', 'tasks', 'task_logs')
      `, [process.env.DB_DATABASE]);
      
      const tableNames = tables.map(t => t.TABLE_NAME);
      logger.info(`   已存在的核心表: ${tableNames.join(', ') || '无'}`);
      
      if (tableNames.length === 0) {
        logger.warn('未找到核心表，请确保已创建基础表结构 (users, tasks, task_logs)');
        logger.info('如果这是全新数据库，请先运行基础建表脚本');
        console.log('');
      }
    } catch (error) {
      logger.warn('检查基础表时出错，继续执行迁移...');
    }

    // 按顺序执行迁移
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      logger.info(`📝 [${i + 1}/${migrations.length}] 执行迁移: ${migration.name}`);
      logger.info(`   描述: ${migration.description}`);
      
      try {
        // 读取迁移文件
        const migrationPath = path.join(__dirname, 'migrations', migration.file);
        
        if (!fs.existsSync(migrationPath)) {
          logger.error(`   迁移文件不存在: ${migrationPath}`);
          continue;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // 执行迁移
        await connection.query(migrationSQL);
        logger.success(`   ✅ ${migration.name} 迁移完成`);
        
      } catch (error) {
        // 检查是否是重复操作的错误（表已存在、字段已存在等）
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_FIELDNAME' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.message.includes('already exists')) {
          logger.info(`   ℹ️  ${migration.name} 已存在，跳过`);
        } else {
          logger.error(`   ❌ ${migration.name} 迁移失败: ${error.message}`);
          logger.error(`   错误代码: ${error.code || 'UNKNOWN'}`);
          // 继续执行其他迁移，不中断
        }
      }
      
      console.log('');
    }

    // 插入游戏字典初始数据
    logger.info('🎮 插入游戏字典初始数据...');
    try {
      // 检查是否已有数据
      const [gameCount] = await connection.execute('SELECT COUNT(*) as count FROM game_names');
      
      if (gameCount[0].count === 0) {
        // 插入热门游戏
        const gameNames = [
          '王者荣耀', '英雄联盟', '和平精英', '原神', '穿越火线',
          '绝地求生', 'DOTA2', 'CS2', '炉石传说', '我的世界'
        ];

        for (let i = 0; i < gameNames.length; i++) {
          await connection.execute(
            'INSERT INTO game_names (name, is_active, sort_order) VALUES (?, TRUE, ?)',
            [gameNames[i], i + 1]
          );
        }

        // 插入通用游戏模式
        const commonModes = [
          '排位赛', '匹配模式', '训练模式', '娱乐模式',
          '团队模式', '单人模式', '竞技模式', '休闲模式'
        ];

        for (let i = 0; i < commonModes.length; i++) {
          await connection.execute(
            'INSERT INTO game_modes (name, game_name_id, is_active, sort_order) VALUES (?, NULL, TRUE, ?)',
            [commonModes[i], i + 1]
          );
        }

        logger.success('游戏字典初始数据插入完成');
      } else {
        logger.info('游戏字典数据已存在，跳过插入');
      }
    } catch (error) {
      logger.error(`游戏字典数据插入失败: ${error.message}`);
    }

    console.log('');
    
    // 验证关键表和数据
    logger.info('🔍 验证数据库状态...');
    
    try {
      // 检查超级管理员账户
      const [adminResult] = await connection.execute(
        'SELECT username, role FROM users WHERE role = ? LIMIT 1',
        ['super_admin']
      );
      
      if (adminResult.length > 0) {
        logger.success(`超级管理员账户: ${adminResult[0].username}`);
      } else {
        logger.warn('未找到超级管理员账户');
      }
      
      // 检查表数量
      const [tableCount] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [process.env.DB_DATABASE]);
      
      logger.info(`数据库表总数: ${tableCount[0].count}`);
      
    } catch (error) {
      logger.error(`验证数据库状态失败: ${error.message}`);
    }

    console.log('');
    logger.success('🎉 数据库初始化完成！');
    console.log('');
    logger.info('📋 默认账户信息:');
    logger.info('   超级管理员: super_admin / admin123');
    logger.info('   注意：生产环境请及时修改默认密码！');
    console.log('');
    logger.info('🌐 现在你可以启动应用程序:');
    logger.info('   cd backend && node server.js');
    logger.info('   或使用 PM2: pm2 start ecosystem.config.js --env production');
    
  } catch (error) {
    logger.error(`数据库初始化失败: ${error.message}`);
    logger.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (error) => {
  logger.error('未处理的Promise拒绝:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行初始化
initializeDatabase().catch(error => {
  logger.error('初始化脚本执行失败:', error);
  process.exit(1);
});