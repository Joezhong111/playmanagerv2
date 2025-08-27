
import { statsRepository } from '../repositories/stats.repository.js';

class StatsService {

  async getTaskStats(filters) {
    const stats = await statsRepository.getTaskStats(filters);
    // Format numbers to ensure consistency
    for (const key in stats) {
      if (stats[key] === null) {
        stats[key] = 0;
      }
      if (typeof stats[key] === 'string') {
        stats[key] = parseFloat(stats[key]);
      }
    }
    return stats;
  }

  async getUserStats(filters) {
    const userStats = await statsRepository.getUserStats(filters);
    return userStats.map(user => {
      for (const key in user) {
        if (user[key] === null) {
          user[key] = 0;
        }
        if (typeof user[key] === 'string') {
          user[key] = parseFloat(user[key]);
        }
      }
      return user;
    });
  }
}

export const statsService = new StatsService();
