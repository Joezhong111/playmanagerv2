import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { playerStatsController } from '../controllers/player-stats.controller.js';

const router = express.Router();

// 所有路由都需要陪玩员权限
router.use(authenticateToken, requireRoles(['player', 'admin', 'super_admin']));

// 陪玩员仪表板概览（现有任务、我的任务、已完成、可接受、今日收入）
router.get('/dashboard', playerStatsController.getDashboardOverview);

// 我的任务列表
router.get('/tasks/my', playerStatsController.getMyTasks);

// 可接受任务列表
router.get('/tasks/available', playerStatsController.getAvailableTasks);

// 收入统计
router.get('/earnings', playerStatsController.getEarningsStats);

// 绩效统计
router.get('/performance', playerStatsController.getPerformanceStats);

// 排行榜信息
router.get('/leaderboard', playerStatsController.getLeaderboardStats);

// 活动历史
router.get('/activity', playerStatsController.getActivityHistory);

// 完整统计报告
router.get('/report', playerStatsController.getFullReport);

export default router;