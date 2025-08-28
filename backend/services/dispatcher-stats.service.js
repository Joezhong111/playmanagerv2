import { pool } from '../config/database.js';

class DispatcherStatsService {
  
  // 获取派单员任务状态统计
  async getTaskStatusStats(dispatcherId) {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingTasks,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as acceptedTasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgressTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalRevenue,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100 as completionRate
        FROM tasks 
        WHERE dispatcher_id = ?
      `, [dispatcherId]);
      
      return stats[0];
    } catch (error) {
      console.error('获取派单员任务统计失败:', error);
      throw error;
    }
  }

  // 获取今日任务统计
  async getTodayTaskStats(dispatcherId) {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as todayTasks,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingTasks,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as acceptedTasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgressTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as todayRevenue
        FROM tasks 
        WHERE dispatcher_id = ? AND DATE(created_at) = CURDATE()
      `, [dispatcherId]);
      
      return stats[0];
    } catch (error) {
      console.error('获取今日任务统计失败:', error);
      throw error;
    }
  }

  // 获取活跃陪玩员统计
  async getActivePlayersStats() {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          u.id,
          u.username,
          u.status,
          COUNT(CASE WHEN t.status = 'in_progress' THEN t.id END) as activeTasks,
          COUNT(CASE WHEN t.status = 'accepted' THEN t.id END) as acceptedTasks,
          COUNT(CASE WHEN t.status = 'pending' AND t.player_id IS NULL THEN 1 END) as availableTasks,
          COUNT(CASE WHEN t.status = 'completed' AND DATE(t.completed_at) = CURDATE() THEN t.id END) as todayCompleted,
          SUM(CASE WHEN t.status = 'completed' AND DATE(t.completed_at) = CURDATE() THEN t.price ELSE 0 END) as todayEarnings
        FROM users u
        LEFT JOIN tasks t ON u.id = t.player_id
        WHERE u.role = 'player' AND u.is_active = TRUE
        GROUP BY u.id, u.username, u.status
        ORDER BY 
          CASE u.status
            WHEN 'idle' THEN 1
            WHEN 'busy' THEN 2
            WHEN 'offline' THEN 3
            ELSE 4
          END,
          activeTasks DESC
      `);
      
      return stats;
    } catch (error) {
      console.error('获取活跃陪玩员统计失败:', error);
      throw error;
    }
  }

  // 获取任务分布统计
  async getTaskDistributionStats(dispatcherId) {
    try {
      // 按状态分布
      const [statusDistribution] = await pool.execute(`
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tasks WHERE dispatcher_id = ?), 2) as percentage
        FROM tasks 
        WHERE dispatcher_id = ?
        GROUP BY status
        ORDER BY count DESC
      `, [dispatcherId, dispatcherId]);
      
      // 按游戏类型分布
      const [gameDistribution] = await pool.execute(`
        SELECT 
          game_name,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tasks WHERE dispatcher_id = ?), 2) as percentage
        FROM tasks 
        WHERE dispatcher_id = ?
        GROUP BY game_name
        ORDER BY count DESC
        LIMIT 10
      `, [dispatcherId, dispatcherId]);
      
      // 按陪玩员分布
      const [playerDistribution] = await pool.execute(`
        SELECT 
          u.username,
          COUNT(t.id) as count,
          ROUND(COUNT(t.id) * 100.0 / (SELECT COUNT(*) FROM tasks WHERE dispatcher_id = ? AND player_id IS NOT NULL), 2) as percentage
        FROM tasks t
        JOIN users u ON t.player_id = u.id
        WHERE t.dispatcher_id = ?
        GROUP BY t.player_id, u.username
        ORDER BY count DESC
        LIMIT 10
      `, [dispatcherId, dispatcherId]);
      
      return {
        statusDistribution,
        gameDistribution,
        playerDistribution
      };
    } catch (error) {
      console.error('获取任务分布统计失败:', error);
      throw error;
    }
  }

  // 获取任务效率统计
  async getTaskEfficiencyStats(dispatcherId) {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalCompletedTasks,
          AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.completed_at)) as avgCompletionTime,
          AVG(TIMESTAMPDIFF(MINUTE, t.accepted_at, t.started_at)) as avgStartTime,
          AVG(TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at)) as avgTaskDuration,
          AVG(t.price) as avgTaskPrice,
          SUM(t.price) as totalRevenue,
          COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, t.created_at, t.completed_at) <= 60 THEN 1 END) as fastCompletedTasks,
          (COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, t.created_at, t.completed_at) <= 60 THEN 1 END) / COUNT(*)) * 100 as fastCompletionRate
        FROM tasks t
        WHERE t.dispatcher_id = ? AND t.status = 'completed'
      `, [dispatcherId]);
      
      return stats[0];
    } catch (error) {
      console.error('获取任务效率统计失败:', error);
      throw error;
    }
  }

  // 获取最近任务活动
  async getRecentTaskActivity(dispatcherId, limit = 10) {
    try {
      const [activities] = await pool.execute(`
        SELECT 
          t.id,
          t.customer_name,
          t.game_name,
          t.status,
          t.price,
          t.created_at,
          t.completed_at,
          u.username as playerName,
          tl.action,
          tl.created_at as activityTime
        FROM tasks t
        LEFT JOIN users u ON t.player_id = u.id
        LEFT JOIN (
          SELECT task_id, action, created_at,
                 ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at DESC) as rn
          FROM task_logs 
        ) tl ON t.id = tl.task_id AND tl.rn = 1
        WHERE t.dispatcher_id = ?
        ORDER BY t.created_at DESC
        LIMIT ?
      `, [dispatcherId, limit]);
      
      return activities;
    } catch (error) {
      console.error('获取最近任务活动失败:', error);
      throw error;
    }
  }

  // 获取月度趋势统计
  async getMonthlyTrendStats(dispatcherId) {
    try {
      const [monthlyStats] = await pool.execute(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as revenue,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100 as completionRate
        FROM tasks 
        WHERE dispatcher_id = ? 
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `, [dispatcherId]);
      
      return monthlyStats;
    } catch (error) {
      console.error('获取月度趋势统计失败:', error);
      throw error;
    }
  }
}

export const dispatcherStatsService = new DispatcherStatsService();