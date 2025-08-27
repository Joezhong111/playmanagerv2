
import { pool } from '../config/database.js';

class TaskRepository {
  
  async create(connection, taskData) {
    const { customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, player_id, status } = taskData;
    const [result] = await connection.execute(
      'INSERT INTO tasks (customer_name, customer_contact, game_name, game_mode, duration, price, requirements, dispatcher_id, player_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customer_name, customer_contact, game_name, game_mode, duration, price, requirements || '', dispatcher_id, player_id || null, status]
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

  async update(id, fields, connection = pool) {
    const fieldEntries = Object.entries(fields);
    const query = `UPDATE tasks SET ${fieldEntries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`;
    const params = [...fieldEntries.map(([, value]) => value), id];
    const [result] = await connection.execute(query, params);
    return result.affectedRows;
  }

  async log(taskId, userId, action, details, connection = pool) {
    await connection.execute(
      'INSERT INTO task_logs (task_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [taskId, userId, action, details ? JSON.stringify(details) : null]
    );
  }
}

export const taskRepository = new TaskRepository();
