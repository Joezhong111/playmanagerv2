import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';

const router = express.Router();

// 初始化数据库表和数据
router.post('/init', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    console.log('开始初始化数据库...');

    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
        password VARCHAR(255) NOT NULL COMMENT '密码哈希',
        role ENUM('dispatcher', 'player') NOT NULL COMMENT '用户角色',
        status ENUM('idle', 'busy', 'offline') DEFAULT 'idle' COMMENT '用户状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) COMMENT '用户表'
    `);
    console.log('✅ 用户表创建成功');

    // 创建任务表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_name VARCHAR(100) NOT NULL COMMENT '客户姓名',
        customer_contact VARCHAR(50) NOT NULL COMMENT '客户联系方式',
        game_name VARCHAR(100) NOT NULL COMMENT '游戏名称',
        game_mode VARCHAR(100) NOT NULL COMMENT '游戏模式',
        duration INT NOT NULL COMMENT '预计时长(小时)',
        price DECIMAL(10,2) NOT NULL COMMENT '价格',
        requirements TEXT COMMENT '特殊要求',
        dispatcher_id INT NOT NULL COMMENT '派单员ID',
        player_id INT COMMENT '陪玩员ID',
        status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        accepted_at TIMESTAMP NULL COMMENT '接受时间',
        started_at TIMESTAMP NULL COMMENT '开始时间', 
        completed_at TIMESTAMP NULL COMMENT '完成时间'
      ) COMMENT '任务表'
    `);
    console.log('✅ 任务表创建成功');

    // 创建任务日志表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_id INT NOT NULL COMMENT '任务ID',
        user_id INT NOT NULL COMMENT '操作用户ID',
        action VARCHAR(50) NOT NULL COMMENT '操作类型',
        details JSON COMMENT '详细信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
      ) COMMENT '任务日志表'
    `);
    console.log('✅ 任务日志表创建成功');

    // 检查是否已有用户数据
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
    
    if (existingUsers[0].count === 0) {
      // 插入测试用户
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(`
        INSERT INTO users (username, password, role) VALUES 
        ('admin', ?, 'dispatcher'),
        ('player1', ?, 'player'),
        ('player2', ?, 'player'),
        ('dispatcher2', ?, 'dispatcher')
      `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword]);
      
      console.log('✅ 测试用户创建成功');

      // 插入测试任务
      await connection.execute(`
        INSERT INTO tasks (customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, status) VALUES
        ('张三', '13800138000', '王者荣耀', '排位赛', 2, 120.00, '需要带到钻石段位', 1, 'pending'),
        ('李四', '13900139000', '英雄联盟', '排位上分', 3, 180.00, '会打辅助位置', 1, 'pending')
      `);
      
      console.log('✅ 测试任务创建成功');
    } else {
      console.log('ℹ️ 数据已存在，跳过插入');
    }

    await connection.commit();
    
    // 获取统计信息
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [taskCount] = await connection.execute('SELECT COUNT(*) as count FROM tasks');

    res.json({
      success: true,
      message: '数据库初始化完成',
      data: {
        userCount: userCount[0].count,
        taskCount: taskCount[0].count
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('数据库初始化失败:', error);
    res.status(500).json({
      success: false,
      error: '数据库初始化失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 设置数据库时区并测试
router.get('/time-test', async (req, res) => {
  try {
    // 获取当前时间的多种格式
    const [result] = await pool.execute(`SELECT NOW() as db_now`);
    
    const jsNow = new Date();
    const jsUTC = new Date().toUTCString();
    
    res.json({
      success: true,
      data: {
        database_now: result[0].db_now,
        javascript: {
          local_time: jsNow,
          utc_time: jsUTC,
          timestamp: jsNow.getTime(),
          timezone_offset: jsNow.getTimezoneOffset()
        }
      }
    });
  } catch (error) {
    console.error('时间测试失败:', error);
    res.status(500).json({
      success: false,
      error: '时间测试失败: ' + error.message
    });
  }
});

// 检查数据库状态
router.get('/status', async (req, res) => {
  try {
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    const tableNames = tables.map(t => t.TABLE_NAME);
    const hasRequiredTables = ['users', 'tasks', 'task_logs'].every(table => 
      tableNames.includes(table)
    );

    if (hasRequiredTables) {
      const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
      const [taskCount] = await pool.execute('SELECT COUNT(*) as count FROM tasks');
      
      res.json({
        success: true,
        initialized: true,
        tables: tableNames,
        data: {
          userCount: userCount[0].count,
          taskCount: taskCount[0].count
        }
      });
    } else {
      res.json({
        success: true,
        initialized: false,
        tables: tableNames,
        message: '数据库未初始化，请调用 /api/setup/init'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新数据库架构 - 添加 paused 状态到任务表
router.post('/update-schema', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('开始更新数据库架构...');

    // 修改任务表的状态枚举，添加 paused 状态
    await connection.execute(`
      ALTER TABLE tasks 
      MODIFY COLUMN status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled') 
      DEFAULT 'pending' 
      COMMENT '任务状态'
    `);
    
    console.log('✅ 任务表状态枚举更新成功');

    // 修改用户表的状态枚举，添加 offline 状态
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN status ENUM('idle', 'busy', 'offline') 
      DEFAULT 'idle' 
      COMMENT '用户状态'
    `);
    
    console.log('✅ 用户表状态枚举更新成功');

    res.json({
      success: true,
      message: '数据库架构更新完成',
      data: {
        updatedColumns: ['tasks.status'],
        addedStatuses: ['paused']
      }
    });

  } catch (error) {
    console.error('数据库架构更新失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库架构更新失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 重置数据库 - 清空所有数据并重新创建测试账户
router.post('/reset', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    console.log('开始重置数据库...');

    // 清空所有表数据
    await connection.execute('DELETE FROM task_logs');
    console.log('✅ 清空任务日志表');
    
    await connection.execute('DELETE FROM tasks');
    console.log('✅ 清空任务表');
    
    await connection.execute('DELETE FROM users');
    console.log('✅ 清空用户表');

    // 重置自增ID
    await connection.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE tasks AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE task_logs AUTO_INCREMENT = 1');
    console.log('✅ 重置自增ID');

    // 插入新的测试用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT INTO users (username, password, role, status) VALUES 
      ('admin', ?, 'dispatcher', 'idle'),
      ('dispatcher2', ?, 'dispatcher', 'idle'),
      ('player1', ?, 'player', 'idle'),
      ('player2', ?, 'player', 'idle'),
      ('player3', ?, 'player', 'busy')
    `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword, hashedPassword]);
    
    console.log('✅ 创建新的测试用户');

    // 插入测试任务
    await connection.execute(`
      INSERT INTO tasks (customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, status) VALUES
      ('张三', '13800138000', '王者荣耀', '排位赛', 2, 120.00, '需要带到钻石段位', 1, 'pending'),
      ('李四', '13900139000', '英雄联盟', '排位上分', 3, 180.00, '会打辅助位置', 1, 'pending'),
      ('王五', '13700137000', '和平精英', '四排上分', 1, 60.00, '需要会开车', 2, 'accepted'),
      ('赵六', '13600136000', '原神', '深渊挑战', 1, 80.00, '需要五星角色', 1, 'completed')
    `);
    
    console.log('✅ 创建测试任务');

    await connection.commit();
    
    // 获取统计信息
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [taskCount] = await connection.execute('SELECT COUNT(*) as count FROM tasks');

    console.log('🎉 数据库重置完成');

    res.json({
      success: true,
      message: '数据库重置完成',
      data: {
        userCount: userCount[0].count,
        taskCount: taskCount[0].count,
        testAccounts: [
          { username: 'admin', password: 'admin123', role: 'dispatcher', description: '主要派单员' },
          { username: 'dispatcher2', password: 'admin123', role: 'dispatcher', description: '副派单员' },
          { username: 'player1', password: 'admin123', role: 'player', description: '陪玩员1 (空闲)' },
          { username: 'player2', password: 'admin123', role: 'player', description: '陪玩员2 (空闲)' },
          { username: 'player3', password: 'admin123', role: 'player', description: '陪玩员3 (忙碌)' }
        ]
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('数据库重置失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库重置失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

export default router;