
import { statsService } from '../services/stats.service.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class StatsController {

  getTaskStats = asyncHandler(async (req, res, next) => {
    // Filters can be passed via query params, e.g., /stats/tasks?startDate=2023-01-01
    const filters = req.query;
    const stats = await statsService.getTaskStats(filters);
    res.status(200).json({ success: true, data: stats });
  });

  getUserStats = asyncHandler(async (req, res, next) => {
    // Filters can be passed via query params, e.g., /stats/users?role=player
    const filters = req.query;
    const stats = await statsService.getUserStats(filters);
    res.status(200).json({ success: true, data: stats });
  });

}

export const statsController = new StatsController();
