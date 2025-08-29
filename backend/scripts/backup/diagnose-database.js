#!/usr/bin/env node

/**
 * 数据库诊断脚本
 * 检查表是否存在，诊断迁移问题
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

async function diagnoseDatabase() {
  let connection;
  
  try {
    console.log('🔍 开始诊断数据库...\n');
    
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

    console.log('✅ 数据库连接成功\n');

    // 检查所有表
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_DATABASE]);

    console.log('📋 数据库中的表:');
    if (tables.length === 0) {
      console.log('   ❌ 没有找到任何表');
    } else {
      tables.forEach(table => {
        console.log(`   ✅ ${table.TABLE_NAME} - ${table.TABLE_COMMENT || '无注释'}`);
      });
    }

    // 检查关键表是否存在
    const requiredTables = ['users', 'tasks', 'task_logs', 'user_sessions'];
    console.log('\n🔍 关键表检查:');
    for (const tableName of requiredTables) {
      const exists = tables.some(t => t.TABLE_NAME === tableName);
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
    }

    // 检查超级管理员账户
    try {
      const [admin] = await connection.execute(
        'SELECT username, role, is_active, status FROM users WHERE role = ? LIMIT 1',
        ['super_admin']
      );
      
      if (admin.length > 0) {
        console.log('\n👤 超级管理员账户:');
        console.log(`   用户名: ${admin[0].username}`);
        console.log(`   角色: ${admin[0].role}`);
        console.log(`   激活: ${admin[0].is_active}`);
        console.log(`   状态: ${admin[0].status}`);
      } else {
        console.log('\n❌ 未找到超级管理员账户');
      }
    } catch (error) {
      console.log('\n❌ 检查超级管理员账户失败:', error.message);
    }

    // 检查任务数量
    try {
      const [taskCount] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
      console.log('\n📊 任务统计:');
      console.log(`   总任务数: ${taskCount[0].count}`);
    } catch (error) {
      console.log('\n❌ 检查任务统计失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行诊断
diagnoseDatabase().catch(error => {
  console.error('诊断失败:', error);
  process.exit(1);
});