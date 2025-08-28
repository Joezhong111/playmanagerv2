import { playerStatsService } from '../services/player-stats.service.js';
import { requireRoles } from '../middleware/auth.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class PlayerStatsController {
  
  // 获取陪玩员仪表板概览
  getDashboardOverview = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const overview = await playerStatsService.getPlayerOverview(playerId);
    
    res.status(200).json({ 
      success: true, 
      data: overview 
    });
  });

  // 获取我的任务列表
  getMyTasks = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const filters = {
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };
    
    const result = await playerStatsService.getMyTasks(playerId, filters);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  });

  // 获取可接受任务列表
  getAvailableTasks = asyncHandler(async (req, res, next) => {
    const filters = {
      gameType: req.query.gameType,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };
    
    const result = await playerStatsService.getAvailableTasks(filters);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  });

  // 获取收入统计
  getEarningsStats = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const { period = 'month' } = req.query;
    
    const stats = await playerStatsService.getEarningsStats(playerId, period);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取绩效统计
  getPerformanceStats = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const stats = await playerStatsService.getPerformanceStats(playerId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取排行榜信息
  getLeaderboardStats = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const stats = await playerStatsService.getLeaderboardStats(playerId);
    
    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  });

  // 获取活动历史
  getActivityHistory = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const { limit = 20 } = req.query;
    
    const activities = await playerStatsService.getActivityHistory(playerId, parseInt(limit));
    
    res.status(200).json({ 
      success: true, 
      data: activities 
    });
  });

  // 获取完整统计报告
  getFullReport = asyncHandler(async (req, res, next) => {
    const playerId = req.user.userId;
    const { period = 'month' } = req.query;
    
    // 并行获取所有统计数据
    const [overview, earnings, performance, leaderboard] = await Promise.all([
      playerStatsService.getPlayerOverview(playerId),
      playerStatsService.getEarningsStats(playerId, period),
      playerStatsService.getPerformanceStats(playerId),
      playerStatsService.getLeaderboardStats(playerId)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview,
        earnings,
        performance,
        leaderboard,
        period,
        timestamp: new Date().toISOString()
      }
    });
  });
}

export const playerStatsController = new PlayerStatsController();