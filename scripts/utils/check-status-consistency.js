#!/usr/bin/env node

/**
 * 状态一致性检查和修复工具
 * 用于检查和修复陪玩员状态与实际任务状态的不一致问题
 */

import { pool } from '../config/database.js';
import { userRepository } from '../repositories/user.repository.js';
import { taskRepository } from '../repositories/task.repository.js';

async function checkStatusConsistency() {
  console.log('🔍 开始检查陪玩员状态一致性...\n');

  try {
    // 获取所有陪玩员
    const [players] = await pool.execute(`
      SELECT id, username, status 
      FROM users 
      WHERE role = 'player' AND is_active = TRUE
      ORDER BY id
    `);

    console.log(`📊 找到 ${players.length} 个陪玩员账户\n`);

    let inconsistencies = 0;
    let fixes = 0;

    for (const player of players) {
      console.log(`🔍 检查陪玩员: ${player.username} (ID: ${player.id})`);
      console.log(`   当前状态: ${player.status}`);

      // 检查活跃任务
      const activeTask = await taskRepository.findActiveTaskByPlayer(player.id);
      const expectedStatus = activeTask ? 'busy' : 'idle';
      
      console.log(`   活跃任务: ${activeTask ? '有' : '无'}`);
      console.log(`   期望状态: ${expectedStatus}`);

      // 检查状态是否一致
      if (player.status !== expectedStatus) {
        console.log(`   ❌ 状态不一致: ${player.status} ≠ ${expectedStatus}`);
        inconsistencies++;

        // 询问是否修复
        const shouldFix = await askForFix(player.username, player.status, expectedStatus);
        
        if (shouldFix) {
          try {
            await userRepository.updateStatus(player.id, expectedStatus);
            console.log(`   ✅ 状态已修复: ${player.status} → ${expectedStatus}`);
            fixes++;
          } catch (error) {
            console.log(`   ❌ 修复失败: ${error.message}`);
          }
        } else {
          console.log(`   ⏭️  跳过修复`);
        }
      } else {
        console.log(`   ✅ 状态一致`);
      }

      console.log(''); // 空行分隔
    }

    // 输出汇总报告
    console.log('📋 检查汇总:');
    console.log(`   总陪玩员数: ${players.length}`);
    console.log(`   状态不一致: ${inconsistencies}`);
    console.log(`   已修复: ${fixes}`);
    console.log(`   未修复: ${inconsistencies - fixes}`);

    if (inconsistencies === 0) {
      console.log('\n🎉 所有陪玩员状态都一致！');
    } else if (fixes === inconsistencies) {
      console.log('\n✅ 所有不一致状态都已修复！');
    } else {
      console.log('\n⚠️  部分状态未修复，请手动检查');
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

// 询问是否修复（模拟交互，自动修复）
async function askForFix(username, currentStatus, expectedStatus) {
  console.log(`   📝 建议修复: ${username} ${currentStatus} → ${expectedStatus}`);
  
  // 自动修复所有不一致状态
  return true;
}

// 显示详细任务信息
async function showPlayerTaskDetails(playerId) {
  const [tasks] = await pool.execute(`
    SELECT id, status, customer_name, game_name, duration, 
           created_at, started_at, completed_at
    FROM tasks 
    WHERE player_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [playerId]);

  if (tasks.length > 0) {
    console.log('   📝 最近任务:');
    tasks.forEach(task => {
      console.log(`      - 任务 ${task.id}: ${task.status} (${task.game_name})`);
    });
  }
}

// 生成状态报告
async function generateStatusReport() {
  console.log('📊 生成状态报告...\n');

  const [report] = await pool.execute(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(CASE WHEN role = 'player' THEN 1 ELSE 0 END) as player_count
    FROM users 
    WHERE is_active = TRUE
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('📈 用户状态分布:');
  report.forEach(row => {
    console.log(`   ${row.status}: ${row.count} (陪玩员: ${row.player_count})`);
  });

  // 检查有任务的陪玩员状态
  const [busyPlayers] = await pool.execute(`
    SELECT DISTINCT u.id, u.username, u.status
    FROM users u
    INNER JOIN tasks t ON u.id = t.player_id
    WHERE u.role = 'player' 
      AND u.is_active = TRUE
      AND t.status IN ('in_progress', 'paused', 'overtime', 'queued')
  `);

  console.log(`\n🎯 有活跃任务的陪玩员: ${busyPlayers.length}`);
  busyPlayers.forEach(player => {
    console.log(`   ${player.username}: ${player.status}`);
  });
}

// 主函数
async function main() {
  console.log('🔧 PlayManagerV2 - 状态一致性检查工具');
  console.log('==============================================\n');

  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    await generateStatusReport();
  } else if (args.includes('--help')) {
    console.log('使用方法:');
    console.log('  node scripts/utils/check-status-consistency.js     # 检查并修复状态');
    console.log('  node scripts/utils/check-status-consistency.js --report  # 生成状态报告');
    console.log('  node scripts/utils/check-status-consistency.js --help     # 显示帮助');
  } else {
    await checkStatusConsistency();
  }
}

// 运行检查
main().catch(console.error);