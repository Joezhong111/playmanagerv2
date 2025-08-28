import { pool } from '../config/database.js';

class PlayerStatsService {
  
  // 获取陪玩员个人统计概览
  async getPlayerOverview(playerId) {
    try {
      // 个人任务统计
      const [taskStats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledTasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as currentTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalEarnings,
          AVG(CASE WHEN status = 'completed' THEN TIMESTAMPDIFF(MINUTE, started_at, completed_at) ELSE NULL END) as avgDuration,
          0 as avgRating
        FROM tasks 
        WHERE player_id = ?
      `, [playerId]);
      
      // 今日统计
      const [todayStats] = await pool.execute(`
        SELECT 
          COUNT(*) as todayTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as todayCompleted,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as todayEarnings,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as activeTasks
        FROM tasks 
        WHERE player_id = ? AND DATE(created_at) = CURDATE()
      `, [playerId]);
      
      // 可接受任务数（待接受且未分配的任务）
      const [availableTasks] = await pool.execute(`
        SELECT COUNT(*) as availableTasks
        FROM tasks 
        WHERE status = 'pending' AND player_id IS NULL
      `);
      
      // 本月统计
      const [monthStats] = await pool.execute(`
        SELECT 
          COUNT(*) as monthTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as monthCompleted,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as monthEarnings
        FROM tasks 
        WHERE player_id = ? 
          AND MONTH(created_at) = MONTH(CURDATE()) 
          AND YEAR(created_at) = YEAR(CURDATE())
      `, [playerId]);
      
      return {
        taskStats: taskStats[0],
        todayStats: todayStats[0],
        availableTasks: availableTasks[0].availableTasks,
        monthStats: monthStats[0]
      };
    } catch (error) {
      console.error('获取陪玩员概览统计失败:', error);
      throw error;
    }
  }

  // 获取陪玩员详细统计信息
  async getPlayerDetailedStats(playerId, period = 'month') {
    try {
      let dateFilter = '';
      if (period === 'today') {
        dateFilter = 'AND DATE(t.created_at) = CURDATE()';
      } else if (period === 'week') {
        dateFilter = 'AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      } else if (period === 'month') {
        dateFilter = 'AND MONTH(t.created_at) = MONTH(CURDATE()) AND YEAR(t.created_at) = YEAR(CURDATE())';
      }

      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelledTasks,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as inProgressTasks,
          COUNT(CASE WHEN t.status = 'paused' THEN 1 END) as pausedTasks,
          SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as totalEarnings,
          AVG(CASE WHEN t.status = 'completed' THEN t.price ELSE NULL END) as avgEarnings,
          AVG(CASE WHEN t.status = 'completed' THEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) ELSE NULL END) as avgDuration,
          0 as avgRating,
          0 as onTimeTasks
        FROM tasks t
        WHERE t.player_id = ? ${dateFilter}
      `, [playerId]);

      // 计算完成率
      const totalTasks = stats[0].totalTasks || 1;
      const completionRate = ((stats[0].completedTasks / totalTasks) * 100).toFixed(1);
      const onTimeRate = stats[0].completedTasks > 0 ? ((stats[0].onTimeTasks / stats[0].completedTasks) * 100).toFixed(1) : 0;

      return {
        ...stats[0],
        completionRate: parseFloat(completionRate),
        onTimeRate: parseFloat(onTimeRate),
        period
      };
    } catch (error) {
      console.error('获取陪玩员详细统计失败:', error);
      throw error;
    }
  }

  // 获取陪玩员收入历史
  async getPlayerEarningsHistory(playerId, period = 'month') {
    try {
      let groupBy = '';
      if (period === 'day') {
        groupBy = 'DATE(t.created_at)';
      } else if (period === 'week') {
        groupBy = 'WEEK(t.created_at)';
      } else if (period === 'month') {
        groupBy = 'MONTH(t.created_at)';
      }

      const [earnings] = await pool.execute(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as taskCount,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completedTasks,
          SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as earnings,
          AVG(CASE WHEN t.status = 'completed' THEN t.price ELSE NULL END) as avgEarnings
        FROM tasks t
        WHERE t.player_id = ? AND t.status = 'completed'
          AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY ${groupBy}
        ORDER BY period DESC
        LIMIT 30
      `, [playerId]);

      return earnings;
    } catch (error) {
      console.error('获取陪玩员收入历史失败:', error);
      throw error;
    }
  }

  // 获取我的任务列表
  async getMyTasks(playerId, filters = {}) {
    try {
      const { status, page = 1, limit = 10 } = filters;
      const limitNum = parseInt(limit) || 10;
      const pageNum = parseInt(page) || 1;
      const offset = (pageNum - 1) * limitNum;
      
      let whereClause = 'WHERE t.player_id = ?';
      const params = [playerId];
      
      if (status) {
        whereClause += ' AND t.status = ?';
        params.push(status);
      }
      
      // 获取任务列表
      // 使用字符串拼接而不是参数绑定来避免LIMIT参数问题
      const limitClause = ` LIMIT ${limitNum} OFFSET ${offset}`;
      const [tasks] = await pool.execute(`
        SELECT 
          t.id,
          t.customer_name,
          t.game_name,
          t.status,
          t.price,
          t.duration,
          t.created_at,
          t.accepted_at,
          t.started_at,
          t.completed_at,
          0 as expected_duration,
          CASE 
            WHEN t.status = 'in_progress' AND t.started_at IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, t.started_at, NOW())
            ELSE NULL
          END as elapsedMinutes
        FROM tasks t
        ${whereClause}
        ORDER BY 
          CASE t.status
            WHEN 'in_progress' THEN 1
            WHEN 'accepted' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'completed' THEN 4
            WHEN 'cancelled' THEN 5
            ELSE 6
          END,
          t.created_at DESC
        ${limitClause}
      `, params);
      
      // 获取总数
      const [countResult] = await pool.execute(`
        SELECT COUNT(*) as total 
        FROM tasks t 
        ${whereClause}
      `, params);
      
      return {
        tasks,
        pagination: {
          total: countResult[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult[0].total / limitNum)
        }
      };
    } catch (error) {
      console.error('获取我的任务列表失败:', error);
      throw error;
    }
  }

  // 获取可接受任务列表
  async getAvailableTasks(filters = {}) {
    try {
      const { gameType, minPrice, maxPrice, page = 1, limit = 10 } = filters;
      const limitNum = parseInt(limit) || 10;
      const pageNum = parseInt(page) || 1;
      const offset = (pageNum - 1) * limitNum;
      
      let whereClause = 'WHERE t.status = "pending" AND t.player_id IS NULL';
      const params = [];
      
      if (gameType) {
        whereClause += ' AND t.game_name = ?';
        params.push(gameType);
      }
      
      if (minPrice) {
        whereClause += ' AND t.price >= ?';
        params.push(minPrice);
      }
      
      if (maxPrice) {
        whereClause += ' AND t.price <= ?';
        params.push(maxPrice);
      }
      
      // 获取可接受任务列表
      const [tasks] = await pool.execute(`
        SELECT 
          t.id,
          t.customer_name,
          t.game_name,
          t.price,
          t.duration,
          t.created_at,
          u.username as dispatcherName,
          COUNT(DISTINCT CASE WHEN ter.status = "pending" THEN 1 END) as pendingExtensions
        FROM tasks t
        JOIN users u ON t.dispatcher_id = u.id
        LEFT JOIN time_extension_requests ter ON t.id = ter.task_id
        ${whereClause}
        GROUP BY t.id, t.customer_name, t.game_name, t.price, t.duration, t.created_at, u.username
        ORDER BY t.created_at ASC, t.price DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `, params);
      
      // 获取总数
      const [countResult] = await pool.execute(`
        SELECT COUNT(*) as total 
        FROM tasks t 
        ${whereClause}
      `, params);
      
      return {
        tasks,
        pagination: {
          total: countResult[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult[0].total / limitNum)
        }
      };
    } catch (error) {
      console.error('获取可接受任务列表失败:', error);
      throw error;
    }
  }

  // 获取收入统计
  async getEarningsStats(playerId, period = 'month') {
    try {
      let dateCondition;
      
      switch (period) {
        case 'today':
          dateCondition = 'DATE(t.completed_at) = CURDATE()';
          break;
        case 'week':
          dateCondition = 'DATE(t.completed_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'MONTH(t.completed_at) = MONTH(CURDATE()) AND YEAR(t.completed_at) = YEAR(CURDATE())';
          break;
        case 'year':
          dateCondition = 'YEAR(t.completed_at) = YEAR(CURDATE())';
          break;
        default:
          dateCondition = '1=1';
      }
      
      // 收入统计
      const [earnings] = await pool.execute(`
        SELECT 
          COUNT(*) as completedTasks,
          SUM(t.price) as totalEarnings,
          AVG(t.price) as avgEarningsPerTask,
          AVG(TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at)) as avgDuration,
          0 as avgRating,
          SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) <= t.duration THEN 1 END) as onTimeTasks,
          (SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) <= t.duration THEN 1 END) / COUNT(*)) * 100 as onTimeRate
        FROM tasks t
        WHERE t.player_id = ? AND t.status = 'completed' AND ${dateCondition}
      `, [playerId]);
      
      // 收入趋势（按天/周/月）
      let groupBy;
      switch (period) {
        case 'today':
          groupBy = 'HOUR(t.completed_at)';
          break;
        case 'week':
          groupBy = 'DATE(t.completed_at)';
          break;
        case 'month':
          groupBy = 'DATE(t.completed_at)';
          break;
        case 'year':
          groupBy = 'MONTH(t.completed_at)';
          break;
        default:
          groupBy = 'DATE(t.completed_at)';
      }
      
      const [trends] = await pool.execute(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as taskCount,
          SUM(t.price) as earnings,
          AVG(t.price) as avgPrice
        FROM tasks t
        WHERE t.player_id = ? AND t.status = 'completed' AND ${dateCondition}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `, [playerId]);
      
      return {
        summary: earnings[0],
        trends
      };
    } catch (error) {
      console.error('获取收入统计失败:', error);
      throw error;
    }
  }

  // 获取绩效统计
  async getPerformanceStats(playerId) {
    try {
      // 完成率统计
      const [completionStats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalAssignedTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledTasks,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100 as completionRate
        FROM tasks 
        WHERE player_id = ?
      `, [playerId]);
      
      // 评分统计
      const [ratingStats] = await pool.execute(`
        SELECT 
          0 as avgRating,
          COUNT(*) as ratedTasks,
          0 as excellentTasks,
          0 as goodTasks,
          0 as averageTasks,
          0 as poorTasks
        FROM tasks 
        WHERE player_id = ? AND status = 'completed'
      `, [playerId]);
      
      // 时效统计
      const [timeStats] = await pool.execute(`
        SELECT 
          AVG(TIMESTAMPDIFF(MINUTE, t.accepted_at, t.started_at)) as avgAcceptToStart,
          AVG(TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at)) as avgStartToComplete,
          AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.completed_at)) as avgTotalTime,
          COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) <= t.duration THEN 1 END) as onTimeTasks,
          (COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) <= t.duration THEN 1 END) / COUNT(*)) * 100 as onTimeRate
        FROM tasks t
        WHERE t.player_id = ? AND t.status = 'completed'
      `, [playerId]);
      
      return {
        completion: completionStats[0],
        rating: ratingStats[0],
        time: timeStats[0]
      };
    } catch (error) {
      console.error('获取绩效统计失败:', error);
      throw error;
    }
  }

  // 获取排行榜信息
  async getLeaderboardStats(playerId) {
    try {
      // 个人排名
      const [myRank] = await pool.execute(`
        SELECT 
          ranking,
          totalPlayers
        FROM (
          SELECT 
            t.player_id,
            RANK() OVER (ORDER BY COUNT(CASE WHEN t.status = 'completed' THEN 1 END) DESC, SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) DESC) as ranking,
            COUNT(DISTINCT t.player_id) OVER () as totalPlayers
          FROM tasks t
          WHERE t.status = 'completed' AND MONTH(t.completed_at) = MONTH(CURDATE()) AND YEAR(t.completed_at) = YEAR(CURDATE())
          GROUP BY t.player_id
        ) ranked
        WHERE player_id = ?
      `, [playerId]);
      
      // 排行榜前10
      const [topPlayers] = await pool.execute(`
        SELECT 
          u.username,
          COUNT(t.id) as completedTasks,
          SUM(t.price) as totalEarnings,
          0 as avgRating,
          RANK() OVER (ORDER BY COUNT(CASE WHEN t.status = 'completed' THEN 1 END) DESC, SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) DESC) as rank
        FROM tasks t
        JOIN users u ON t.player_id = u.id
        WHERE t.status = 'completed' AND MONTH(t.completed_at) = MONTH(CURDATE()) AND YEAR(t.completed_at) = YEAR(CURDATE())
        GROUP BY t.player_id, u.username
        ORDER BY rank ASC
        LIMIT 10
      `);
      
      return {
        myRank: myRank[0] || { ranking: null, totalPlayers: 0 },
        topPlayers
      };
    } catch (error) {
      console.error('获取排行榜统计失败:', error);
      throw error;
    }
  }

  // 获取活动历史
  async getActivityHistory(playerId, limit = 20) {
    try {
      const limitNum = parseInt(limit) || 20;
      const [activities] = await pool.execute(`
        SELECT 
          tl.action,
          tl.created_at,
          tl.details,
          t.customer_name,
          t.game_name,
          t.price
        FROM task_logs tl
        JOIN tasks t ON tl.task_id = t.id
        WHERE tl.user_id = ?
        ORDER BY tl.created_at DESC
        LIMIT ${limitNum}
      `, [playerId]);
      
      return activities;
    } catch (error) {
      console.error('获取活动历史失败:', error);
      throw error;
    }
  }
}

export const playerStatsService = new PlayerStatsService();