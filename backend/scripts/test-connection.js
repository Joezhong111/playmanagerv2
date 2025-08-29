#!/usr/bin/env node

/**
 * 快速数据库连接测试
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'dispatch_system',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 30000
};

async function testConnection() {
  console.log('🔗 测试数据库连接...');
  console.log('配置:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 测试简单查询
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', result[0]);

    // 检查现有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 当前数据库有 ${tables.length} 个表:`);
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    console.log('🎉 数据库测试完成');

  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    if (error.code) {
      console.error('错误码:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection();