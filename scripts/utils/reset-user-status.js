#!/usr/bin/env node

/**
 * 手动重置用户状态脚本
 * 用于修复陪玩员状态异常问题
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3000/api';

async function resetUserStatus() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node reset-user-status.js <用户ID> [管理员token]');
    console.log('示例: node reset-user-status.js 2 your_admin_token_here');
    process.exit(1);
  }

  const userId = args[0];
  const adminToken = args[1];

  if (!adminToken) {
    console.log('请提供管理员token');
    process.exit(1);
  }

  try {
    console.log(`🔄 重置用户 ${userId} 的状态...`);
    
    const response = await axios.post(
      `${BASE_URL}/users/${userId}/reset-status`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    console.log('✅ 重置成功！');
    console.log('结果:', response.data);

  } catch (error) {
    console.error('❌ 重置失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

resetUserStatus();