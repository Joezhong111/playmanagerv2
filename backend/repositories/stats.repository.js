
import { pool } from '../config/database.js';

class StatsRepository {

  async getTaskStats(filters) {
    const { startDate, endDate, dispatcherId, playerId, groupBy = 'day' } = filters;
    let params = [];
    let whereClauses = [];

    if (startDate) {
      whereClauses.push('t.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('t.created_at <= ?');
      params.push(endDate);
    }
    if (dispatcherId) {
      whereClauses.push('t.dispatcher_id = ?');
      params.push(dispatcherId);
    }
    if (playerId) {
      whereClauses.push('t.player_id = ?');
      params.push(playerId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledTasks,
        AVG(CASE WHEN status = 'completed' THEN TIMESTAMPDIFF(MINUTE, started_at, completed_at) ELSE NULL END) as averageDuration,
        SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalEarnings,
        (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as completionRate
      FROM tasks t
      ${whereSql}
    `;

    const [rows] = await pool.execute(query, params);
    return rows[0];
  }

  async getUserStats(filters) {
    const { startDate, endDate, role } = filters;
    let params = [];
    let taskWhereClauses = [];
    let userWhereClauses = [];

    if (startDate) {
      taskWhereClauses.push('t.completed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      taskWhereClauses.push('t.completed_at <= ?');
      params.push(endDate);
    }
    if (role) {
      userWhereClauses.push('u.role = ?');
      params.push(role);
    }

    const taskWhereSql = taskWhereClauses.length > 0 ? `AND ${taskWhereClauses.join(' AND ')}` : '';
    const userWhereSql = userWhereClauses.length > 0 ? `WHERE ${userWhereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        u.id as userId,
        u.username,
        u.role,
        u.status,
        COUNT(t.id) as completedTasks,
        SUM(t.price) as totalEarnings,
        AVG(TIMESTAMPDIFF(MINUTE, t.started_at, t.completed_at)) as averageDuration
      FROM users u
      LEFT JOIN tasks t ON u.id = t.player_id AND t.status = 'completed' ${taskWhereSql}
      ${userWhereSql}
      GROUP BY u.id, u.username, u.role, u.status
      ORDER BY totalEarnings DESC, completedTasks DESC
    `;

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

export const statsRepository = new StatsRepository();
