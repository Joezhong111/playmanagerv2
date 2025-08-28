import { dispatcherStatsService } from '../services/dispatcher-stats.service.js';
import { requireRoles } from '../middleware/auth.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class DispatcherStatsController {
  
  // 获取任务状态统计（派单员主页核心统计）
  getTaskStatusStats = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const stats = await dispatcherStatsService.getTaskStatusStats(dispatcherId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取今日任务统计
  getTodayTaskStats = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const stats = await dispatcherStatsService.getTodayTaskStats(dispatcherId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取活跃陪玩员统计
  getActivePlayersStats = asyncHandler(async (req, res, next) => {
    const stats = await dispatcherStatsService.getActivePlayersStats();
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取任务分布统计
  getTaskDistributionStats = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const stats = await dispatcherStatsService.getTaskDistributionStats(dispatcherId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取任务效率统计
  getTaskEfficiencyStats = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const stats = await dispatcherStatsService.getTaskEfficiencyStats(dispatcherId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取最近任务活动
  getRecentTaskActivity = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const { limit = 10 } = req.query;
    const activities = await dispatcherStatsService.getRecentTaskActivity(dispatcherId, parseInt(limit));
    
    res.status(200).json({ 
      success: true, 
      data: activities 
    });
  });

  // 获取月度趋势统计
  getMonthlyTrendStats = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    const stats = await dispatcherStatsService.getMonthlyTrendStats(dispatcherId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取派单员仪表板概览
  getDashboardOverview = asyncHandler(async (req, res, next) => {
    const dispatcherId = req.user.userId;
    
    // 并行获取所有统计数据
    const [taskStats, todayStats, activePlayers, efficiencyStats] = await Promise.all([
      dispatcherStatsService.getTaskStatusStats(dispatcherId),
      dispatcherStatsService.getTodayTaskStats(dispatcherId),
      dispatcherStatsService.getActivePlayersStats(),
      dispatcherStatsService.getTaskEfficiencyStats(dispatcherId)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        taskStats,
        todayStats,
        activePlayers,
        efficiencyStats,
        timestamp: new Date().toISOString()
      }
    });
  });
}

export const dispatcherStatsController = new DispatcherStatsController();