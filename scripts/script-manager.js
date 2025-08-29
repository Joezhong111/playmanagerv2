#!/usr/bin/env node

/**
 * 脚本管理器
 * 统一管理所有测试和调试脚本
 */

import { logger, colors } from './utils/tools.js';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

class ScriptManager {
  constructor() {
    this.scripts = {
      // 数据库相关脚本
      database: {
        'init': {
          name: '初始化数据库',
          file: 'database/init-database.js',
          description: '创建数据库表结构和超级管理员账户'
        },
        'init-sql': {
          name: '初始化SQL脚本',
          file: 'database/init_super_admin.sql',
          description: 'SQL格式的数据库初始化脚本'
        },
        'validate': {
          name: '验证数据库',
          file: 'test/database-validator.js',
          description: '验证数据库结构和数据完整性'
        }
      },
      
      // 用户管理脚本
      user: {
        'activate-super-admin': {
          name: '激活超级管理员',
          file: 'utils/activate-super-admin.js',
          description: '激活或创建超级管理员账户'
        },
        'super-admin-manager': {
          name: '超级管理员管理',
          file: 'utils/super-admin-manager.js',
          description: '超级管理员账户管理工具'
        }
      },
      
      // API测试脚本
      api: {
        'test-backend': {
          name: '后端API测试',
          file: 'test/test-backend-api.js',
          description: '测试后端API响应和数据'
        },
        'check-player-tasks': {
          name: '检查玩家任务',
          file: 'test/check-player-tasks.js',
          description: '检查玩家任务数据显示问题'
        }
      },
      
      // 完整测试套件
      test: {
        'system': {
          name: '系统测试套件',
          file: 'test/system-test-suite.js',
          description: '完整的系统功能测试'
        },
        'task-lifecycle': {
          name: '任务生命周期测试',
          file: 'test/task-lifecycle-test.js',
          description: '测试任务的完整生命周期'
        }
      }
    };
  }

  async runScript(category, scriptName, args = []) {
    const script = this.scripts[category]?.[scriptName];
    
    if (!script) {
      logger.error(`脚本不存在: ${category}/${scriptName}`);
      return false;
    }
    
    logger.info(`🚀 执行脚本: ${script.name}`);
    logger.info(`📝 描述: ${script.description}`);
    logger.info(`📁 文件: ${script.file}`);
    
    try {
      const scriptPath = join(process.cwd(), script.file);
      const child = spawn('node', [scriptPath, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      return new Promise((resolve) => {
        child.on('close', (code) => {
          if (code === 0) {
            logger.success(`✅ 脚本执行成功: ${script.name}`);
            resolve(true);
          } else {
            logger.error(`❌ 脚本执行失败: ${script.name} (退出码: ${code})`);
            resolve(false);
          }
        });
        
        child.on('error', (error) => {
          logger.error(`❌ 脚本执行错误: ${script.name}`, error);
          resolve(false);
        });
      });
      
    } catch (error) {
      logger.error(`❌ 脚本执行失败: ${script.name}`, error);
      return false;
    }
  }

  showHelp() {
    logger.info('📋 PlayManagerV2 脚本管理器\n');
    logger.info('使用方法: node script-manager.js <category> <script> [args...]\n');
    
    logger.info('📂 可用脚本分类:\n');
    
    for (const [category, scripts] of Object.entries(this.scripts)) {
      logger.info(`${colors.info(category.toUpperCase())}:`);
      
      for (const [scriptName, script] of Object.entries(scripts)) {
        logger.info(`  ${scriptName} - ${script.name}`);
        logger.info(`    ${script.description}`);
        logger.info(`    文件: ${script.file}\n`);
      }
    }
    
    logger.info('🔧 使用示例:');
    logger.info('  node script-manager.js database init');
    logger.info('  node script-manager.js user activate-super-admin');
    logger.info('  node script-manager.js api test-backend');
    logger.info('  node script-manager.js test system');
    
    logger.info('\n💡 提示: 使用 node script-manager.js help 查看此帮助信息');
  }

  async runQuickTests() {
    logger.info('🚀 运行快速测试套件...\n');
    
    const quickTests = [
      { category: 'database', script: 'validate', name: '数据库验证' },
      { category: 'api', script: 'test-backend', name: 'API测试' },
      { category: 'user', script: 'activate-super-admin', name: '超级管理员检查' }
    ];
    
    const results = [];
    
    for (const test of quickTests) {
      logger.info(`🔍 执行: ${test.name}`);
      const success = await this.runScript(test.category, test.script);
      results.push({ ...test, success });
      logger.info(''); // 空行分隔
    }
    
    // 显示结果摘要
    logger.info('📊 快速测试结果:');
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    for (const result of results) {
      const status = result.success ? colors.success('✅') : colors.error('❌');
      logger.info(`  ${status} ${result.name}`);
    }
    
    logger.info(`\n总计: ${passed}/${total} 测试通过`);
    
    if (passed === total) {
      logger.success('✨ 所有快速测试通过！');
      return true;
    } else {
      logger.error('❌ 部分测试失败，请检查系统状态');
      return false;
    }
  }

  async runFullTests() {
    logger.info('🚀 运行完整测试套件...\n');
    
    const fullTests = [
      { category: 'database', script: 'init', name: '数据库初始化' },
      { category: 'user', script: 'activate-super-admin', name: '超级管理员激活' },
      { category: 'database', script: 'validate', name: '数据库验证' },
      { category: 'api', script: 'test-backend', name: 'API测试' },
      { category: 'api', script: 'check-player-tasks', name: '玩家任务检查' },
      { category: 'test', script: 'system', name: '系统测试套件' },
      { category: 'test', script: 'task-lifecycle', name: '任务生命周期测试' }
    ];
    
    const results = [];
    
    for (const test of fullTests) {
      logger.info(`🔍 执行: ${test.name}`);
      const success = await this.runScript(test.category, test.script);
      results.push({ ...test, success });
      logger.info(''); // 空行分隔
    }
    
    // 显示结果摘要
    logger.info('📊 完整测试结果:');
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    for (const result of results) {
      const status = result.success ? colors.success('✅') : colors.error('❌');
      logger.info(`  ${status} ${result.name}`);
    }
    
    logger.info(`\n总计: ${passed}/${total} 测试通过`);
    
    if (passed === total) {
      logger.success('✨ 所有完整测试通过！');
      return true;
    } else {
      logger.error('❌ 部分测试失败，请检查系统状态');
      return false;
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const manager = new ScriptManager();
  
  if (args.length === 0 || args[0] === 'help') {
    manager.showHelp();
    return;
  }
  
  if (args[0] === 'quick') {
    const success = await manager.runQuickTests();
    process.exit(success ? 0 : 1);
    return;
  }
  
  if (args[0] === 'full') {
    const success = await manager.runFullTests();
    process.exit(success ? 0 : 1);
    return;
  }
  
  if (args.length < 2) {
    logger.error('使用方法: node script-manager.js <category> <script> [args...]');
    logger.info('使用 node script-manager.js help 查看帮助');
    process.exit(1);
    return;
  }
  
  const [category, scriptName, ...scriptArgs] = args;
  const success = await manager.runScript(category, scriptName, scriptArgs);
  process.exit(success ? 0 : 1);
}

// 运行脚本管理器
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ScriptManager;