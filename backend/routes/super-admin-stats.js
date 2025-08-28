import express from 'express';
import { body, query } from 'express-validator';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { superAdminStatsController } from '../controllers/super-admin-stats.controller.js';

const router = express.Router();

// 所有路由都需要超级管理员权限
router.use(authenticateToken, requireSuperAdmin);

// 系统概览
router.get('/overview', superAdminStatsController.getSystemOverview);

// 趋势分析
router.get('/trends', [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('时间周期必须是 7d, 30d, 90d 或 1y')
], superAdminStatsController.getTrendAnalysis);

// 用户绩效排行
router.get('/performance/rankings', [
  query('role')
    .optional()
    .isIn(['player', 'dispatcher'])
    .withMessage('角色必须是 player 或 dispatcher'),
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'year'])
    .withMessage('时间周期必须是 today, week, month 或 year'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('限制数量必须是1-100之间的整数')
], superAdminStatsController.getUserPerformanceRankings);

// 收入分析
router.get('/revenue/analysis', [
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'year'])
    .withMessage('时间周期必须是 today, week, month 或 year')
], superAdminStatsController.getRevenueAnalysis);

// 系统健康度
router.get('/health', superAdminStatsController.getSystemHealth);

// 实时监控
router.get('/monitoring/realtime', superAdminStatsController.getRealTimeMonitoring);

// 详细报表
router.get('/reports/:reportType', [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),
  query('format')
    .optional()
    .isIn(['detailed', 'summary'])
    .withMessage('格式必须是 detailed 或 summary')
], superAdminStatsController.getDetailedReport);

// 自定义报表
router.post('/reports/custom', [
  body('metrics')
    .isArray({ min: 1 })
    .withMessage('指标列表不能为空'),
  body('metrics.*')
    .isIn(['taskCount', 'completedTasks', 'revenue', 'avgDuration', 'completionRate'])
    .withMessage('无效的指标类型'),
  body('timeRange')
    .optional()
    .isObject()
    .withMessage('时间范围必须是对象'),
  body('timeRange.startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  body('timeRange.endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),
  body('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'user', 'game'])
    .withMessage('分组方式必须是 day, week, month, user 或 game')
], superAdminStatsController.getCustomReport);

// 报表导出
router.post('/export', [
  body('reportType')
    .isIn(['system_overview', 'user_performance', 'revenue_analysis', 'user_activity', 'task_performance', 'revenue_summary'])
    .withMessage('无效的报表类型'),
  body('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('导出格式必须是 json 或 csv'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('筛选条件必须是对象')
], superAdminStatsController.exportReport);

export default router;