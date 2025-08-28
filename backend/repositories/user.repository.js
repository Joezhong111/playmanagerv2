
import { pool } from '../config/database.js';

class UserRepository {

  async create(userData, connection = pool) {
    const { username, password, role } = userData;
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );
    return result.insertId;
  }

  async findById(id, connection = pool) {
    const [rows] = await connection.execute(
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async findByUsername(username, connection = pool) {
    const [rows] = await connection.execute(
      'SELECT id, username, password, role, status, is_active FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  async find(conditions, connection = pool) {
    const fieldEntries = Object.entries(conditions);
    const query = `SELECT id, username, status, updated_at FROM users WHERE ${fieldEntries.map(([key]) => `${key} = ?`).join(' AND ')} ORDER BY updated_at ASC`;
    const params = fieldEntries.map(([, value]) => value);
    const [rows] = await connection.execute(query, params);
    return rows;
  }

  async findAll(queryParams, connection = pool) {
    let query = 'SELECT id, username, role, status, created_at, updated_at FROM users';
    const params = [];
    const whereClauses = [];

    if (queryParams.role) {
      whereClauses.push('role = ?');
      params.push(queryParams.role);
    }
    if (queryParams.status) {
      whereClauses.push('status = ?');
      params.push(queryParams.status);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await connection.execute(query, params);
    return rows;
  }

  async findAllPlayersWithTaskCount(connection = pool) {
    const [rows] = await connection.execute(`
      SELECT 
        u.id, 
        u.username, 
        u.status, 
        u.updated_at,
        
        -- 活跃任务统计 (进行中、已接受、暂停)
        COUNT(CASE WHEN t.status IN ('accepted', 'in_progress', 'paused') THEN t.id END) as active_tasks,
        
        -- 总任务统计 (所有非取消状态)
        COUNT(CASE WHEN t.status != 'cancelled' THEN t.id END) as total_tasks,
        
        -- 排队任务统计
        COUNT(CASE WHEN t.status = 'queued' THEN t.id END) as queued_tasks,
        
        -- 已完成任务统计
        COUNT(CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        
        -- 当前进行中的任务信息
        MAX(CASE WHEN t.status = 'in_progress' THEN t.id END) as current_task_id,
        MAX(CASE WHEN t.status = 'in_progress' THEN t.game_name END) as current_game_name,
        MAX(CASE WHEN t.status = 'in_progress' THEN t.customer_name END) as current_customer_name,
        MAX(CASE WHEN t.status = 'in_progress' THEN t.duration END) as current_duration,
        MAX(CASE WHEN t.status = 'in_progress' THEN t.started_at END) as current_started_at
        
      FROM users u
      LEFT JOIN tasks t ON u.id = t.player_id
      WHERE u.role = 'player'
      GROUP BY u.id, u.username, u.status, u.updated_at
      ORDER BY 
        CASE u.status 
          WHEN 'busy' THEN 1 
          WHEN 'idle' THEN 2 
          WHEN 'offline' THEN 3 
          ELSE 4 
        END,
        u.updated_at DESC
    `);
    
    // 处理每个陪玩员的数据，计算任务进度
    return rows.map(player => {
      const currentTaskProgress = this.calculateTaskProgress(player);
      return {
        ...player,
        current_task_progress: currentTaskProgress,
        current_task_time_remaining: this.calculateTimeRemaining(player)
      };
    });
  }

  // 计算任务进度百分比
  calculateTaskProgress(player) {
    if (!player.current_started_at || !player.current_duration) {
      return 0;
    }
    
    const startTime = new Date(player.current_started_at).getTime();
    const currentTime = new Date().getTime();
    const durationMs = player.current_duration * 60 * 1000; // 转换为毫秒
    const elapsedMs = currentTime - startTime;
    
    const progress = Math.min(Math.max((elapsedMs / durationMs) * 100, 0), 100);
    return Math.round(progress);
  }

  // 计算任务剩余时间（分钟）
  calculateTimeRemaining(player) {
    if (!player.current_started_at || !player.current_duration) {
      return 0;
    }
    
    const startTime = new Date(player.current_started_at).getTime();
    const currentTime = new Date().getTime();
    const durationMs = player.current_duration * 60 * 1000; // 转换为毫秒
    const elapsedMs = currentTime - startTime;
    const remainingMs = durationMs - elapsedMs;
    
    const remainingMinutes = Math.max(Math.ceil(remainingMs / (60 * 1000)), 0);
    return remainingMinutes;
  }

  async updateStatus(id, status, connection = pool) {
    // 先查询当前状态
    const [currentRows] = await connection.execute(
      'SELECT status FROM users WHERE id = ?',
      [id]
    );
    const currentStatus = currentRows[0]?.status || 'unknown';
    
    console.log(`[UserRepository] 更新用户 ${id} 状态从 ${currentStatus} 到 ${status}`);
    const [result] = await connection.execute(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    console.log(`[UserRepository] 状态更新结果: 受影响行数 ${result.affectedRows}`);
    return result;
  }

  async update(id, userData, connection = pool) {
    const fieldEntries = Object.entries(userData);
    const query = `UPDATE users SET ${fieldEntries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [...fieldEntries.map(([, value]) => value), id];
    const [result] = await connection.execute(query, params);
    return result;
  }

  async delete(id, connection = pool) {
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result;
  }
}

export const userRepository = new UserRepository();
