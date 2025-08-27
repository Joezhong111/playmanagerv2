#!/usr/bin/env node

// 简单的数据库架构更新脚本
// 这个脚本会调用后端的 /api/setup/update-schema 端点来更新数据库架构

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/api/setup/update-schema',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('响应:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('原始响应:', data);
    }
    
    if (res.statusCode === 200) {
      console.log('✅ 数据库架构更新成功！');
    } else {
      console.log('❌ 数据库架构更新失败');
    }
    
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('请求失败:', error.message);
  process.exit(1);
});

req.write(JSON.stringify({}));
req.end();