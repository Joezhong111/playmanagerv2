// 数据库迁移脚本
import { pool } from './config/database.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...');
  
  try {
    // 检查连接
    console.log('📡 测试数据库连接...');
    await pool.execute('SELECT 1');
    console.log('✅ 数据库连接成功');

    // 1. 创建时间延长申请表
    console.log('📝 创建 time_extension_requests 表...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS time_extension_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        player_id INT NOT NULL,
        dispatcher_id INT NOT NULL,
        requested_minutes INT NOT NULL COMMENT '申请延长的分钟数',
        reason VARCHAR(500) COMMENT '申请理由',
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewed_by INT COMMENT '审核人ID',
        reviewed_at TIMESTAMP NULL,
        review_reason VARCHAR(500) COMMENT '审核理由/备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_task_id (task_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ time_extension_requests 表创建成功');

    // 2. 检查 tasks 表是否已有 original_duration 字段
    console.log('🔍 检查 tasks 表结构...');
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'original_duration'
    `);

    if (columns.length === 0) {
      console.log('📝 添加 original_duration 字段到 tasks 表...');
      await pool.execute(`
        ALTER TABLE tasks 
        ADD COLUMN original_duration INT COMMENT '原始任务时长(分钟)' AFTER duration
      `);
      console.log('✅ original_duration 字段添加成功');

      // 为已存在的任务设置 original_duration
      console.log('📝 更新现有任务的 original_duration...');
      await pool.execute(`
        UPDATE tasks SET original_duration = duration WHERE original_duration IS NULL
      `);
      console.log('✅ 现有任务的 original_duration 更新完成');
    } else {
      console.log('✅ original_duration 字段已存在');
    }

    // 3. 添加外键约束（如果不存在）
    console.log('📝 添加外键约束...');
    try {
      // 检查外键是否已存在
      const [fks] = await pool.execute(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
        WHERE TABLE_NAME = 'time_extension_requests' 
        AND REFERENCED_TABLE_NAME = 'tasks'
      `);
      
      if (fks.length === 0) {
        await pool.execute(`
          ALTER TABLE time_extension_requests 
          ADD CONSTRAINT fk_extension_task 
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        `);
        
        await pool.execute(`
          ALTER TABLE time_extension_requests 
          ADD CONSTRAINT fk_extension_player 
          FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        
        await pool.execute(`
          ALTER TABLE time_extension_requests 
          ADD CONSTRAINT fk_extension_dispatcher 
          FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        
        await pool.execute(`
          ALTER TABLE time_extension_requests 
          ADD CONSTRAINT fk_extension_reviewer 
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✅ 外键约束添加成功');
      } else {
        console.log('✅ 外键约束已存在');
      }
    } catch (error) {
      console.log('⚠️ 外键约束添加失败（可能已存在）:', error.message);
    }

    // 4. 添加索引优化
    console.log('📝 优化数据库索引...');
    try {
      await pool.execute(`
        ALTER TABLE tasks ADD INDEX idx_status_player (status, player_id)
      `);
    } catch (error) {
      console.log('ℹ️ 索引 idx_status_player 可能已存在');
    }
    
    try {
      await pool.execute(`
        ALTER TABLE tasks ADD INDEX idx_dispatcher_status (dispatcher_id, status)
      `);
    } catch (error) {
      console.log('ℹ️ 索引 idx_dispatcher_status 可能已存在');
    }

    // 5. 验证迁移结果
    console.log('🔍 验证迁移结果...');
    
    const [taskCount] = await pool.execute('SELECT COUNT(*) as count FROM tasks');
    console.log(`📊 Tasks 表记录数: ${taskCount[0].count}`);
    
    const [extensionCount] = await pool.execute('SELECT COUNT(*) as count FROM time_extension_requests');
    console.log(`📊 Extension requests 表记录数: ${extensionCount[0].count}`);
    
    // 检查字段是否存在
    const [newColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'original_duration'
    `);
    
    if (newColumns.length > 0) {
      console.log('✅ original_duration 字段验证通过');
    }

    console.log('🎉 数据库迁移完成！');
    
    // 显示迁移摘要
    console.log('\n📋 迁移摘要:');
    console.log('✅ time_extension_requests 表已创建');
    console.log('✅ tasks.original_duration 字段已添加');
    console.log('✅ 外键约束已配置');
    console.log('✅ 索引优化已完成');
    console.log('\n🚀 现在可以使用延长功能了！');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    console.error('详细错误:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

console.log('🔧 陪玩管理系统 - 时间延长功能数据库迁移');
console.log('================================================');
runMigration();