
import { pool } from '../config/database.js';

class TaskRepository {
  
  async create(connection, taskData) {
    const { customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, player_id, status, queue_order, queued_at } = taskData;
    const [result] = await connection.execute(
      'INSERT INTO tasks (customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, player_id, status, queue_order, queued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customer_name, customer_contact, game_name, game_mode, duration, price, requirements || '', dispatcher_id, player_id || null, status, queue_order || null, queued_at || null]
    );
    return result.insertId;
  }

  async findById(id, connection = pool) {
    const [rows] = await connection.execute(`
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE t.id = ?
    `, [id]);
    return rows[0];
  }

  async find(query, params, connection = pool) {
    const [rows] = await connection.execute(query, params);
    return rows;
  }

  // 获取陪玩员的下一个排队任务
  async getNextQueuedTask(playerId, connection = pool) {
    const [rows] = await connection.execute(`
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE t.player_id = ? AND t.status = 'queued'
      ORDER BY t.queue_order ASC, t.queued_at ASC
      LIMIT 1
    `, [playerId]);
    return rows[0];
  }

  // 获取陪玩员的所有排队任务
  async getQueuedTasksByPlayer(playerId, connection = pool) {
    const [rows] = await connection.execute(`
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE t.player_id = ? AND t.status = 'queued'
      ORDER BY t.queue_order ASC, t.queued_at ASC
    `, [playerId]);
    return rows;
  }

  async update(id, fields, connection = pool) {
    const fieldEntries = Object.entries(fields);
    const query = `UPDATE tasks SET ${fieldEntries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`;
    const params = [...fieldEntries.map(([, value]) => value), id];
    const [result] = await connection.execute(query, params);
    return result.affectedRows;
  }

  // 更新任务状态
  async updateTaskStatus(id, status, connection = pool) {
    const [result] = await connection.execute(
      'UPDATE tasks SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  // 查找陪玩员的活跃任务（进行中、已暂停、超时、排队中）
  async findActiveTaskByPlayer(playerId, connection = pool) {
    const [rows] = await connection.execute(`
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE t.player_id = ? AND t.status IN ('in_progress', 'paused', 'overtime', 'queued')
      LIMIT 1
    `, [playerId]);
    return rows[0];
  }

  // 查找需要处理超时的任务
  async findOvertimeTasks(connection = pool) {
    const [rows] = await connection.execute(`
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE t.status = 'in_progress' 
        AND t.overtime_at IS NOT NULL 
        AND t.overtime_at <= NOW()
        AND t.started_at IS NOT NULL
    `);
    return rows;
  }

  // 获取超时统计信息
  async getOvertimeStats(connection = pool) {
    const [rows] = await connection.execute(`
      SELECT 
        COUNT(*) as total_overtime_tasks,
        COUNT(CASE WHEN status = 'overtime' THEN 1 END) as current_overtime_tasks,
        COUNT(CASE WHEN status = 'in_progress' AND overtime_at <= NOW() THEN 1 END) as pending_overtime_tasks
      FROM tasks 
      WHERE overtime_at IS NOT NULL
    `);
    return rows[0];
  }

  async log(taskId, userId, action, details, connection = pool) {
    await connection.execute(
      'INSERT INTO task_logs (task_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [taskId, userId, action, details ? JSON.stringify(details) : null]
    );
  }
}

export const taskRepository = new TaskRepository();
