#!/usr/bin/env node

/**
 * 超级管理员功能测试脚本
 * 用于测试新实现的超级管理员功能和统计API
 */

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用户账户
const TEST_USERS = {
  super_admin: {
    username: 'super_admin',
    password: 'admin123'
  },
  dispatcher: {
    username: 'dispatcher1',
    password: 'password123'
  },
  player: {
    username: 'player1',
    password: 'password123'
  }
};

class APITester {
  constructor() {
    this.tokens = {};
  }

  // 登录获取token
  async login(userType) {
    const user = TEST_USERS[userType];
    if (!user) {
      throw new Error(`Unknown user type: ${userType}`);
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Login failed: ${data.message}`);
    }

    this.tokens[userType] = data.data.token;
    console.log(`✅ ${userType} 登录成功`);
    return data.data.token;
  }

  // 通用API请求方法
  async apiRequest(endpoint, options = {}) {
    const { method = 'GET', userType, body, headers = {} } = options;
    
    const token = userType ? this.tokens[userType] : null;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { response, data };
  }

  // 测试权限控制
  async testPermissions() {
    console.log('\n🔐 测试权限控制...');
    
    const testCases = [
      {
        name: '超级管理员用户管理',
        endpoint: '/super-admin/users',
        allowed: ['super_admin'],
        forbidden: ['dispatcher', 'player']
      },
      {
        name: '超级管理员统计',
        endpoint: '/super-admin/stats/overview',
        allowed: ['super_admin'],
        forbidden: ['dispatcher', 'player']
      },
      {
        name: '派单员统计',
        endpoint: '/dispatcher/stats/dashboard',
        allowed: ['super_admin', 'dispatcher'],
        forbidden: ['player']
      },
      {
        name: '陪玩员统计',
        endpoint: '/player/stats/dashboard',
        allowed: ['super_admin', 'player'],
        forbidden: ['dispatcher']
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 测试: ${testCase.name}`);
      
      for (const userType of Object.keys(TEST_USERS)) {
        try {
          const { response, data } = await this.apiRequest(testCase.endpoint, {
            userType,
          });

          if (testCase.allowed.includes(userType)) {
            if (response.ok) {
              console.log(`  ✅ ${userType}: 允许访问`);
            } else {
              console.log(`  ❌ ${userType}: 应该允许但被拒绝 (${data.message})`);
            }
          } else if (testCase.forbidden.includes(userType)) {
            if (response.status === 403) {
              console.log(`  ✅ ${userType}: 正确拒绝访问`);
            } else {
              console.log(`  ❌ ${userType}: 应该拒绝但允许访问`);
            }
          }
        } catch (error) {
          console.log(`  ⚠️  ${userType}: 请求失败 (${error.message})`);
        }
      }
    }
  }

  // 测试超级管理员功能
  async testSuperAdminFeatures() {
    console.log('\n👑 测试超级管理员功能...');
    
    if (!this.tokens.super_admin) {
      await this.login('super_admin');
    }

    // 测试用户管理
    console.log('\n📁 测试用户管理...');
    
    try {
      // 获取用户列表
      const { data: usersData } = await this.apiRequest('/super-admin/users', {
        userType: 'super_admin',
      });
      
      if (usersData.success) {
        console.log(`  ✅ 获取用户列表成功，共 ${usersData.data.users.length} 个用户`);
      } else {
        console.log(`  ❌ 获取用户列表失败: ${usersData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 用户管理测试失败: ${error.message}`);
    }

    // 测试统计功能
    console.log('\n📊 测试统计功能...');
    
    try {
      const { data: statsData } = await this.apiRequest('/super-admin/stats/overview', {
        userType: 'super_admin',
      });
      
      if (statsData.success) {
        console.log('  ✅ 获取系统概览成功');
        console.log(`     总用户数: ${statsData.data.overview.totalUsers}`);
        console.log(`     总任务数: ${statsData.data.tasks.totalTasks}`);
      } else {
        console.log(`  ❌ 获取系统概览失败: ${statsData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 统计功能测试失败: ${error.message}`);
    }

    // 测试实时监控
    console.log('\n🔍 测试实时监控...');
    
    try {
      const { data: monitoringData } = await this.apiRequest('/super-admin/stats/monitoring/realtime', {
        userType: 'super_admin',
      });
      
      if (monitoringData.success) {
        console.log('  ✅ 获取实时监控成功');
      } else {
        console.log(`  ❌ 获取实时监控失败: ${monitoringData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 实时监控测试失败: ${error.message}`);
    }
  }

  // 测试派单员统计功能
  async testDispatcherStats() {
    console.log('\n📋 测试派单员统计功能...');
    
    if (!this.tokens.dispatcher) {
      await this.login('dispatcher');
    }

    try {
      const { data: dashboardData } = await this.apiRequest('/dispatcher/stats/dashboard', {
        userType: 'dispatcher',
      });
      
      if (dashboardData.success) {
        console.log('  ✅ 获取派单员仪表板成功');
        console.log(`     总任务数: ${dashboardData.data.taskStats.totalTasks}`);
        console.log(`     进行中任务: ${dashboardData.data.taskStats.inProgressTasks}`);
        console.log(`     完成任务数: ${dashboardData.data.taskStats.completedTasks}`);
      } else {
        console.log(`  ❌ 获取派单员仪表板失败: ${dashboardData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 派单员统计测试失败: ${error.message}`);
    }
  }

  // 测试陪玩员统计功能
  async testPlayerStats() {
    console.log('\n🎮 测试陪玩员统计功能...');
    
    if (!this.tokens.player) {
      await this.login('player');
    }

    try {
      const { data: dashboardData } = await this.apiRequest('/player/stats/dashboard', {
        userType: 'player',
      });
      
      if (dashboardData.success) {
        console.log('  ✅ 获取陪玩员仪表板成功');
        console.log(`     今日收入: ${dashboardData.data.todayStats.todayEarnings}`);
        console.log(`     完成任务数: ${dashboardData.data.taskStats.completedTasks}`);
        console.log(`     可接受任务: ${dashboardData.data.availableTasks}`);
      } else {
        console.log(`  ❌ 获取陪玩员仪表板失败: ${dashboardData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 陪玩员统计测试失败: ${error.message}`);
    }
  }

  // 测试会话管理
  async testSessionManagement() {
    console.log('\n🔐 测试会话管理...');
    
    // 测试登录和登出
    try {
      await this.login('player');
      
      const { data: logoutData } = await this.apiRequest('/auth/logout', {
        userType: 'player',
      });
      
      if (logoutData.success) {
        console.log('  ✅ 登出功能正常');
      } else {
        console.log(`  ❌ 登出失败: ${logoutData.message}`);
      }
    } catch (error) {
      console.log(`  ❌ 会话管理测试失败: ${error.message}`);
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始超级管理员功能测试...\n');
    
    try {
      // 登录所有用户
      console.log('🔑 登录测试用户...');
      for (const userType of Object.keys(TEST_USERS)) {
        try {
          await this.login(userType);
        } catch (error) {
          console.log(`  ⚠️  ${userType} 登录失败: ${error.message}`);
        }
      }

      // 运行测试
      await this.testPermissions();
      await this.testSuperAdminFeatures();
      await this.testDispatcherStats();
      await this.testPlayerStats();
      await this.testSessionManagement();

      console.log('\n✅ 所有测试完成！');
      
    } catch (error) {
      console.error('\n❌ 测试过程中发生错误:', error);
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

export default APITester;