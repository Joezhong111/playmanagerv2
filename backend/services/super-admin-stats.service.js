import { pool } from '../config/database.js';

class SuperAdminStatsService {
  
  // 获取系统整体统计数据
  async getSystemOverview(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      // 基础统计
      const [basicStats] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT u.id) as totalUsers,
          COUNT(DISTINCT CASE WHEN u.is_active = TRUE THEN u.id END) as activeUsers,
          COUNT(DISTINCT CASE WHEN u.role = 'player' THEN u.id END) as totalPlayers,
          COUNT(DISTINCT CASE WHEN u.role = 'player' AND u.is_active = TRUE THEN u.id END) as activePlayers,
          COUNT(DISTINCT CASE WHEN u.role = 'dispatcher' THEN u.id END) as totalDispatchers,
          COUNT(DISTINCT CASE WHEN u.role = 'dispatcher' AND u.is_active = TRUE THEN u.id END) as activeDispatchers
        FROM users u
      `);
      
      // 任务统计
      const [taskStats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingTasks,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as acceptedTasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgressTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalRevenue,
          AVG(CASE WHEN status = 'completed' THEN duration ELSE NULL END) as avgDuration,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100 as completionRate
        FROM tasks 
        WHERE ${startDate ? 'created_at >= ? AND' : ''} ${endDate ? 'created_at <= ? AND' : ''} 1=1
      `, [startDate, endDate].filter(Boolean));
      
      // 今日统计
      const [todayStats] = await pool.execute(`
        SELECT 
          COUNT(*) as todayTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as todayCompleted,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as todayRevenue,
          COUNT(DISTINCT dispatcher_id) as activeDispatchersToday,
          COUNT(DISTINCT player_id) as activePlayersToday
        FROM tasks 
        WHERE DATE(created_at) = CURDATE()
      `);
      
      // 本月统计
      const [monthStats] = await pool.execute(`
        SELECT 
          COUNT(*) as monthTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as monthCompleted,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as monthRevenue,
          AVG(CASE WHEN status = 'completed' THEN duration ELSE NULL END) as monthAvgDuration
        FROM tasks 
        WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
      `);
      
      return {
        overview: basicStats[0],
        tasks: taskStats[0],
        today: todayStats[0],
        month: monthStats[0]
      };
    } catch (error) {
      console.error('获取系统概览失败:', error);
      throw error;
    }
  }

  // 获取趋势分析数据
  async getTrendAnalysis(period = '7d') {
    try {
      let interval, dateCondition;
      
      switch (period) {
        case '7d':
          interval = 'DAY';
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case '30d':
          interval = 'DAY';
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case '90d':
          interval = 'WEEK';
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
          break;
        case '1y':
          interval = 'MONTH';
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
          break;
        default:
          interval = 'DAY';
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      }
      
      // 任务趋势
      const [taskTrends] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as totalTasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTasks,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as revenue
        FROM tasks 
        WHERE ${dateCondition}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      
      // 用户增长趋势
      const [userTrends] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as newUsers,
          COUNT(CASE WHEN role = 'player' THEN 1 END) as newPlayers,
          COUNT(CASE WHEN role = 'dispatcher' THEN 1 END) as newDispatchers
        FROM users 
        WHERE ${dateCondition}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      
      return {
        taskTrends,
        userTrends,
        period
      };
    } catch (error) {
      console.error('获取趋势分析失败:', error);
      throw error;
    }
  }

  // 获取用户绩效排行
  async getUserPerformanceRankings(filters = {}) {
    try {
      const { role = 'player', period = 'month', limit = 10 } = filters;
      
      let dateCondition = '';
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
      
      const [rankings] = await pool.execute(`
        SELECT 
          u.id,
          u.username,
          u.role,
          u.status,
          COUNT(t.id) as completedTasks,
          SUM(t.price) as totalEarnings,
          AVG(TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at)) as avgDuration,
          0 as avgRating,
          COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelledTasks,
          (SUM(t.price) / NULLIF(COUNT(t.id), 0)) as avgEarningsPerTask
        FROM users u
        LEFT JOIN tasks t ON u.id = t.player_id AND t.status = 'completed' AND ${dateCondition}
        WHERE u.role = ? AND u.is_active = TRUE
        GROUP BY u.id, u.username, u.role, u.status
        HAVING completedTasks > 0
        ORDER BY totalEarnings DESC, completedTasks DESC
        LIMIT ?
      `, [role, limit]);
      
      return rankings;
    } catch (error) {
      console.error('获取用户绩效排行失败:', error);
      throw error;
    }
  }

  // 获取收入分析
  async getRevenueAnalysis(period = 'month') {
    try {
      let dateCondition, groupBy;
      
      switch (period) {
        case 'today':
          dateCondition = 'DATE(created_at) = CURDATE()';
          groupBy = 'HOUR(created_at)';
          break;
        case 'week':
          dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          groupBy = 'DATE(created_at)';
          break;
        case 'month':
          dateCondition = 'MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())';
          groupBy = 'DATE(created_at)';
          break;
        case 'year':
          dateCondition = 'YEAR(created_at) = YEAR(CURDATE())';
          groupBy = 'MONTH(created_at)';
          break;
        default:
          dateCondition = '1=1';
          groupBy = 'DATE(created_at)';
      }
      
      // 收入趋势
      const [revenueTrend] = await pool.execute(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as taskCount,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as revenue,
          AVG(CASE WHEN status = 'completed' THEN price ELSE NULL END) as avgPrice
        FROM tasks 
        WHERE ${dateCondition}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `);
      
      // 收入分布（按游戏类型）
      const [revenueByGame] = await pool.execute(`
        SELECT 
          game_name,
          COUNT(*) as taskCount,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as revenue,
          AVG(CASE WHEN status = 'completed' THEN price ELSE NULL END) as avgPrice
        FROM tasks 
        WHERE status = 'completed' AND ${dateCondition}
        GROUP BY game_name
        ORDER BY revenue DESC
      `);
      
      // 收入分布（按派单员）
      const [revenueByDispatcher] = await pool.execute(`
        SELECT 
          u.username as dispatcherName,
          COUNT(t.id) as taskCount,
          SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as revenue,
          AVG(CASE WHEN t.status = 'completed' THEN t.price ELSE NULL END) as avgPrice
        FROM tasks t
        JOIN users u ON t.dispatcher_id = u.id
        WHERE ${dateCondition}
        GROUP BY t.dispatcher_id, u.username
        ORDER BY revenue DESC
      `);
      
      return {
        revenueTrend,
        revenueByGame,
        revenueByDispatcher,
        period
      };
    } catch (error) {
      console.error('获取收入分析失败:', error);
      throw error;
    }
  }

  // 获取系统健康度指标
  async getSystemHealthMetrics() {
    try {
      // 系统响应时间（模拟）
      const responseTime = Math.random() * 100 + 50; // 50-150ms
      
      // 数据库连接数
      const [dbConnections] = await pool.execute('SHOW STATUS LIKE "Threads_connected"');
      const activeConnections = parseInt(dbConnections[0].Value);
      
      // 活跃用户数
      const [activeUsers] = await pool.execute(`
        SELECT COUNT(DISTINCT user_id) as activeUsers
        FROM user_sessions 
        WHERE is_active = TRUE AND expires_at > NOW()
      `);
      
      // 系统负载（模拟）
      const systemLoad = (Math.random() * 0.5 + 0.1).toFixed(2); // 0.1-0.6
      
      // 错误率（最近24小时）
      const [errorStats] = await pool.execute(`
        SELECT 
          COUNT(*) as totalRequests,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as errorCount
        FROM tasks 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      
      const errorRate = errorStats[0].totalRequests > 0 
        ? ((errorStats[0].errorCount / errorStats[0].totalRequests) * 100).toFixed(2)
        : 0;
      
      return {
        responseTime: responseTime.toFixed(2),
        activeConnections,
        activeUsers: activeUsers[0].activeUsers,
        systemLoad,
        errorRate: parseFloat(errorRate),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取系统健康度失败:', error);
      throw error;
    }
  }

  // 获取详细报表数据
  async getDetailedReport(reportType, filters = {}) {
    try {
      const { startDate, endDate, format = 'detailed' } = filters;
      
      switch (reportType) {
        case 'user_activity':
          return await this.getUserActivityReport(startDate, endDate, format);
        case 'task_performance':
          return await this.getTaskPerformanceReport(startDate, endDate, format);
        case 'revenue_summary':
          return await this.getRevenueSummaryReport(startDate, endDate, format);
        default:
          throw new Error('不支持的报表类型');
      }
    } catch (error) {
      console.error('获取详细报表失败:', error);
      throw error;
    }
  }

  // 用户活跃度报表
  async getUserActivityReport(startDate, endDate, format) {
    const [report] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.status,
        u.is_active,
        u.last_login_at,
        u.login_count,
        COUNT(DISTINCT t.id) as totalTasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completedTasks,
        SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as totalEarnings,
        AVG(CASE WHEN t.status = 'completed' THEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) ELSE NULL END) as avgDuration
      FROM users u
      LEFT JOIN tasks t ON u.id = t.player_id 
        AND ${startDate ? 't.created_at >= ? AND' : ''} ${endDate ? 't.created_at <= ? AND' : ''} 1=1
      GROUP BY u.id, u.username, u.role, u.status, u.is_active, u.last_login_at, u.login_count
      ORDER BY totalEarnings DESC, completedTasks DESC
    `, [startDate, endDate].filter(Boolean));
    
    return report;
  }

  // 任务绩效报表
  async getTaskPerformanceReport(startDate, endDate, format) {
    const [report] = await pool.execute(`
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as totalTasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pendingTasks,
        COUNT(CASE WHEN t.status = 'accepted' THEN 1 END) as acceptedTasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as inProgressTasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completedTasks,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelledTasks,
        SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as revenue,
        AVG(CASE WHEN t.status = 'completed' THEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) ELSE NULL END) as avgDuration,
        (COUNT(CASE WHEN t.status = 'completed' THEN 1 END) / COUNT(*)) * 100 as completionRate
      FROM tasks t
      WHERE ${startDate ? 't.created_at >= ? AND' : ''} ${endDate ? 't.created_at <= ? AND' : ''} 1=1
      GROUP BY DATE(t.created_at)
      ORDER BY date ASC
    `, [startDate, endDate].filter(Boolean));
    
    return report;
  }

  // 收入汇总报表
  async getRevenueSummaryReport(startDate, endDate, format) {
    const [report] = await pool.execute(`
      SELECT 
        u.username as dispatcherName,
        COUNT(t.id) as taskCount,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completedTasks,
        SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as revenue,
        AVG(CASE WHEN t.status = 'completed' THEN t.price ELSE NULL END) as avgPrice,
        COUNT(DISTINCT t.player_id) as uniquePlayers
      FROM tasks t
      JOIN users u ON t.dispatcher_id = u.id
      WHERE ${startDate ? 't.created_at >= ? AND' : ''} ${endDate ? 't.created_at <= ? AND' : ''} 1=1
      GROUP BY t.dispatcher_id, u.username
      ORDER BY revenue DESC
    `, [startDate, endDate].filter(Boolean));
    
    return report;
  }
}

export const superAdminStatsService = new SuperAdminStatsService();