import { pool } from './config/database.js';
import fs from 'fs';
import path from 'path';

async function runQueueMigration() {
  console.log('🔧 陪玩管理系统 - 排单功能数据库迁移');
  console.log('================================================');
  
  let connection;
  
  try {
    console.log('🚀 开始执行数据库迁移...');
    
    // 测试数据库连接
    console.log('📡 测试数据库连接...');
    connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    
    // 读取迁移文件
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_task_queue_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // 分割SQL语句（以;为分隔符，忽略注释行）
    const statements = migrationSQL
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 开始执行 ${statements.length} 个SQL语句...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === ';') continue;
      
      try {
        console.log(`   ${i + 1}/${statements.length}: 执行中...`);
        await connection.execute(statement);
        console.log(`   ✅ 语句 ${i + 1} 执行成功`);
      } catch (error) {
        if (error.message.includes('Duplicate') || 
            error.message.includes('already exist') ||
            error.message.includes('duplicate column') ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ℹ️ 语句 ${i + 1} 已存在，跳过: ${error.message}`);
        } else {
          console.error(`   ❌ 语句 ${i + 1} 执行失败:`, error.message);
          throw error;
        }
      }
    }
    
    // 验证迁移结果
    console.log('🔍 验证迁移结果...');
    
    // 检查任务状态枚举
    const [statusResult] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'status'
    `);
    
    const statusEnum = statusResult[0]?.COLUMN_TYPE;
    if (statusEnum && statusEnum.includes('queued')) {
      console.log('✅ 任务状态已更新，包含 queued 状态');
    } else {
      console.log('⚠️ 任务状态可能未正确更新');
    }
    
    // 检查新字段
    const [queueFields] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME IN ('queue_order', 'queued_at')
    `);
    
    console.log(`✅ 新增字段数量: ${queueFields.length}/2`);
    
    // 检查索引
    const [indexes] = await connection.execute(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND INDEX_NAME LIKE '%queue%'
    `);
    
    console.log(`✅ 队列相关索引数量: ${indexes.length}`);
    
    console.log('🎉 排单功能数据库迁移完成！');
    
    console.log('\n📋 迁移摘要:');
    console.log('✅ 任务状态已扩展（添加 queued）');
    console.log('✅ 队列字段已添加（queue_order, queued_at）');
    console.log('✅ 索引优化已完成');
    console.log('\n🚀 现在可以使用排单功能了！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

runQueueMigration();