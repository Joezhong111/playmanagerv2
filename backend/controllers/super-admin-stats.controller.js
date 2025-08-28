import { superAdminStatsService } from '../services/super-admin-stats.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';
import { pool } from '../config/database.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class SuperAdminStatsController {
  
  // 获取系统概览
  getSystemOverview = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const overview = await superAdminStatsService.getSystemOverview({ startDate, endDate });
    
    res.status(200).json({ 
      success: true, 
      data: overview 
    });
  });

  // 获取趋势分析
  getTrendAnalysis = asyncHandler(async (req, res, next) => {
    const { period = '7d' } = req.query;
    const trends = await superAdminStatsService.getTrendAnalysis(period);
    
    res.status(200).json({ 
      success: true, 
      data: trends 
    });
  });

  // 获取用户绩效排行
  getUserPerformanceRankings = asyncHandler(async (req, res, next) => {
    const { role, period, limit } = req.query;
    const rankings = await superAdminStatsService.getUserPerformanceRankings({
      role,
      period,
      limit: parseInt(limit) || 10
    });
    
    res.status(200).json({ 
      success: true, 
      data: rankings 
    });
  });

  // 获取收入分析
  getRevenueAnalysis = asyncHandler(async (req, res, next) => {
    const { period = 'month' } = req.query;
    const analysis = await superAdminStatsService.getRevenueAnalysis(period);
    
    res.status(200).json({ 
      success: true, 
      data: analysis 
    });
  });

  // 获取系统健康度
  getSystemHealth = asyncHandler(async (req, res, next) => {
    const health = await superAdminStatsService.getSystemHealthMetrics();
    
    res.status(200).json({ 
      success: true, 
      data: health 
    });
  });

  // 获取详细报表
  getDetailedReport = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { reportType } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      format: req.query.format || 'detailed'
    };
    
    const report = await superAdminStatsService.getDetailedReport(reportType, filters);
    
    res.status(200).json({ 
      success: true, 
      data: report 
    });
  });

  // 获取实时监控数据
  getRealTimeMonitoring = asyncHandler(async (req, res, next) => {
    try {
      // 实时任务状态
      const [taskStatus] = await pool.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM tasks 
        GROUP BY status
      `);
      
      // 实时用户状态
      const [userStatus] = await pool.execute(`
        SELECT 
          role,
          status,
          COUNT(*) as count
        FROM users 
        WHERE is_active = TRUE
        GROUP BY role, status
      `);
      
      // 最近活动
      const [recentActivity] = await pool.execute(`
        SELECT 
          tl.action,
          tl.created_at,
          u.username,
          CASE 
            WHEN tl.task_id IS NOT NULL THEN (SELECT customer_name FROM tasks WHERE id = tl.task_id)
            ELSE NULL
          END as relatedTask
        FROM task_logs tl
        JOIN users u ON tl.user_id = u.id
        ORDER BY tl.created_at DESC
        LIMIT 10
      `);
      
      // 系统性能指标
      const performance = await superAdminStatsService.getSystemHealthMetrics();
      
      res.status(200).json({
        success: true,
        data: {
          taskStatus,
          userStatus,
          recentActivity,
          performance,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取实时监控数据失败:', error);
      throw error;
    }
  });

  // 获取自定义报表
  getCustomReport = asyncHandler(async (req, res, next) => {
    const { 
      metrics, 
      timeRange, 
      groupBy, 
      filters = {} 
    } = req.body;
    
    try {
      // 构建自定义查询
      let query = 'SELECT ';
      let groupByClause = '';
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      // 处理时间范围
      if (timeRange) {
        const { startDate, endDate } = timeRange;
        if (startDate) {
          whereClause += ' AND t.created_at >= ?';
          params.push(startDate);
        }
        if (endDate) {
          whereClause += ' AND t.created_at <= ?';
          params.push(endDate);
        }
      }
      
      // 处理分组
      if (groupBy) {
        switch (groupBy) {
          case 'day':
            groupByClause = 'DATE(t.created_at)';
            break;
          case 'week':
            groupByClause = 'WEEK(t.created_at)';
            break;
          case 'month':
            groupByClause = 'MONTH(t.created_at)';
            break;
          case 'user':
            groupByClause = 't.player_id, u.username';
            break;
          case 'game':
            groupByClause = 't.game_name';
            break;
          default:
            groupByClause = 'DATE(t.created_at)';
        }
      }
      
      // 处理指标
      const selectClauses = [];
      if (metrics.includes('taskCount')) {
        selectClauses.push('COUNT(*) as taskCount');
      }
      if (metrics.includes('completedTasks')) {
        selectClauses.push('COUNT(CASE WHEN t.status = "completed" THEN 1 END) as completedTasks');
      }
      if (metrics.includes('revenue')) {
        selectClauses.push('SUM(CASE WHEN t.status = "completed" THEN t.price ELSE 0 END) as revenue');
      }
      if (metrics.includes('avgDuration')) {
        selectClauses.push('AVG(CASE WHEN t.status = "completed" THEN TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at) ELSE NULL END) as avgDuration');
      }
      if (metrics.includes('completionRate')) {
        selectClauses.push('(COUNT(CASE WHEN t.status = "completed" THEN 1 END) / COUNT(*)) * 100 as completionRate');
      }
      
      query += selectClauses.join(', ');
      
      if (groupByClause) {
        query += ', ' + groupByClause + ' as groupField';
      }
      
      query += ' FROM tasks t';
      
      if (groupBy === 'user') {
        query += ' LEFT JOIN users u ON t.player_id = u.id';
      }
      
      query += ' ' + whereClause;
      
      if (groupByClause) {
        query += ' GROUP BY ' + groupByClause;
      }
      
      query += ' ORDER BY groupField ASC';
      
      const [results] = await pool.execute(query, params);
      
      res.status(200).json({
        success: true,
        data: {
          report: results,
          metadata: {
            metrics,
            timeRange,
            groupBy,
            filters,
            generatedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('获取自定义报表失败:', error);
      throw error;
    }
  });

  // 导出报表
  exportReport = asyncHandler(async (req, res, next) => {
    const { reportType, format = 'json', filters = {} } = req.body;
    
    try {
      let report;
      
      switch (reportType) {
        case 'system_overview':
          report = await superAdminStatsService.getSystemOverview(filters);
          break;
        case 'user_performance':
          report = await superAdminStatsService.getUserPerformanceRankings(filters);
          break;
        case 'revenue_analysis':
          report = await superAdminStatsService.getRevenueAnalysis(filters.period);
          break;
        case 'user_activity':
          report = await superAdminStatsService.getDetailedReport('user_activity', filters);
          break;
        case 'task_performance':
          report = await superAdminStatsService.getDetailedReport('task_performance', filters);
          break;
        case 'revenue_summary':
          report = await superAdminStatsService.getDetailedReport('revenue_summary', filters);
          break;
        default:
          throw new Error('不支持的报表类型');
      }
      
      if (format === 'csv') {
        // 转换为CSV格式
        const csvData = this.convertToCSV(report, reportType);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
        res.status(200).send(csvData);
      } else {
        // JSON格式
        res.status(200).json({
          success: true,
          data: report,
          metadata: {
            reportType,
            format,
            filters,
            exportedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('导出报表失败:', error);
      throw error;
    }
  });

  // 转换为CSV格式
  convertToCSV(data, reportType) {
    // 根据不同的报表类型生成CSV
    let csvContent = '';
    
    switch (reportType) {
      case 'system_overview':
        csvContent = '指标,数值\n';
        csvContent += `总用户数,${data.overview.totalUsers}\n`;
        csvContent += `活跃用户数,${data.overview.activeUsers}\n`;
        csvContent += `总任务数,${data.tasks.totalTasks}\n`;
        csvContent += `完成任务数,${data.tasks.completedTasks}\n`;
        csvContent += `总收入,${data.tasks.totalRevenue}\n`;
        csvContent += `完成率,${data.tasks.completionRate}%\n`;
        break;
        
      case 'user_performance':
        csvContent = '用户名,角色,状态,完成任务数,总收入,平均时长,平均评分\n';
        data.forEach(user => {
          csvContent += `${user.username},${user.role},${user.status},${user.completedTasks},${user.totalEarnings},${user.avgDuration || 0},${user.avgRating || 0}\n`;
        });
        break;
        
      default:
        csvContent = '数据导出\n';
        csvContent += JSON.stringify(data, null, 2);
    }
    
    return csvContent;
  }
}

export const superAdminStatsController = new SuperAdminStatsController();