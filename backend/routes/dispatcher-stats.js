import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { dispatcherStatsController } from '../controllers/dispatcher-stats.controller.js';

const router = express.Router();

// 所有路由都需要派单员权限
router.use(authenticateToken, requireRoles(['dispatcher', 'admin', 'super_admin']));

// 派单员仪表板概览
router.get('/dashboard', dispatcherStatsController.getDashboardOverview);

// 任务状态统计（总数、待接受、进行中、已完成）
router.get('/tasks/status', dispatcherStatsController.getTaskStatusStats);

// 今日任务统计
router.get('/tasks/today', dispatcherStatsController.getTodayTaskStats);

// 活跃陪玩员统计
router.get('/players/active', dispatcherStatsController.getActivePlayersStats);

// 任务分布统计
router.get('/tasks/distribution', dispatcherStatsController.getTaskDistributionStats);

// 任务效率统计
router.get('/tasks/efficiency', dispatcherStatsController.getTaskEfficiencyStats);

// 最近任务活动
router.get('/tasks/recent', dispatcherStatsController.getRecentTaskActivity);

// 月度趋势统计
router.get('/trends/monthly', dispatcherStatsController.getMonthlyTrendStats);

export default router;