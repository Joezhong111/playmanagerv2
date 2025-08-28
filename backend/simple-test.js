#!/usr/bin/env node

/**
 * 简单的API测试脚本
 * 测试超级管理员功能是否正常工作
 */

const API_BASE_URL = 'http://localhost:3003/api';

// 测试函数
async function testAPI() {
  console.log('🚀 开始API功能测试...\n');

  try {
    // 1. 测试超级管理员登录
    console.log('1️⃣ 测试超级管理员登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'super_admin',
        password: 'admin123'
      }),
    });

    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      console.log('✅ 超级管理员登录成功');
      const token = loginData.data.token;
      
      // 2. 测试超级管理员统计API
      console.log('\n2️⃣ 测试超级管理员统计API...');
      const statsResponse = await fetch(`${API_BASE_URL}/super-admin/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        console.log('✅ 超级管理员统计API正常');
        console.log(`   - 总用户数: ${statsData.data.overview?.totalUsers || 'N/A'}`);
        console.log(`   - 总任务数: ${statsData.data.tasks?.totalTasks || 'N/A'}`);
      } else {
        console.log(`❌ 超级管理员统计API失败: ${statsData.message}`);
      }

      // 3. 测试用户管理API
      console.log('\n3️⃣ 测试用户管理API...');
      const usersResponse = await fetch(`${API_BASE_URL}/super-admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const usersData = await usersResponse.json();
      
      if (usersData.success) {
        console.log('✅ 用户管理API正常');
        console.log(`   - 用户数量: ${usersData.data.users?.length || 0}`);
      } else {
        console.log(`❌ 用户管理API失败: ${usersData.message}`);
      }

      // 4. 测试权限控制
      console.log('\n4️⃣ 测试权限控制...');
      
      // 测试无权限访问
      const noAuthResponse = await fetch(`${API_BASE_URL}/super-admin/users`);
      
      if (noAuthResponse.status === 401) {
        console.log('✅ 权限控制正常 - 未认证用户被拒绝');
      } else {
        console.log('❌ 权限控制异常 - 未认证用户可以访问');
      }

    } else {
      console.log(`❌ 超级管理员登录失败: ${loginData.message}`);
      
      // 如果登录失败，可能是数据库中没有超级管理员账户
      console.log('\n💡 提示: 如果登录失败，请确保数据库中已创建超级管理员账户');
      console.log('   可以运行以下SQL来创建账户:');
      console.log('   INSERT INTO users (username, password, role, is_active) VALUES');
      console.log("   ('super_admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', TRUE);");
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('   错误详情:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 无法连接到服务器，请确保后端服务器正在运行');
      console.log('   运行命令: cd backend && npm run dev');
    } else if (error.message.includes('fetch failed')) {
      console.log('\n💡 提示: 网络请求失败，可能原因:');
      console.log('   1. 服务器未启动');
      console.log('   2. 端口号不正确');
      console.log('   3. CORS配置问题');
      console.log('   请检查服务器状态和配置');
    }
  }

  console.log('\n✅ API测试完成！');
}

// 运行测试
testAPI().catch(console.error);