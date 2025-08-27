import { pool } from '../config/database.js';

class ExtensionRepository {
  
  async create(connection, data) {
    const { task_id, player_id, dispatcher_id, requested_minutes, reason } = data;
    
    const query = `
      INSERT INTO time_extension_requests 
      (task_id, player_id, dispatcher_id, requested_minutes, reason) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      task_id, 
      player_id, 
      dispatcher_id, 
      requested_minutes, 
      reason
    ]);
    
    return result.insertId;
  }

  async findById(id) {
    const query = `
      SELECT ter.*, 
             t.customer_name, 
             t.game_name, 
             t.duration as task_duration,
             p.username as player_name,
             d.username as dispatcher_name,
             r.username as reviewer_name
      FROM time_extension_requests ter
      LEFT JOIN tasks t ON ter.task_id = t.id
      LEFT JOIN users p ON ter.player_id = p.id
      LEFT JOIN users d ON ter.dispatcher_id = d.id
      LEFT JOIN users r ON ter.reviewed_by = r.id
      WHERE ter.id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  async findByTaskId(taskId) {
    const query = `
      SELECT ter.*, 
             p.username as player_name,
             d.username as dispatcher_name,
             r.username as reviewer_name
      FROM time_extension_requests ter
      LEFT JOIN users p ON ter.player_id = p.id
      LEFT JOIN users d ON ter.dispatcher_id = d.id
      LEFT JOIN users r ON ter.reviewed_by = r.id
      WHERE ter.task_id = ?
      ORDER BY ter.created_at DESC
    `;
    
    const [rows] = await pool.execute(query, [taskId]);
    return rows;
  }

  async findPendingRequests(dispatcherId = null) {
    let query = `
      SELECT ter.*, 
             t.customer_name, 
             t.game_name, 
             t.duration as task_duration,
             p.username as player_name,
             d.username as dispatcher_name
      FROM time_extension_requests ter
      LEFT JOIN tasks t ON ter.task_id = t.id
      LEFT JOIN users p ON ter.player_id = p.id
      LEFT JOIN users d ON ter.dispatcher_id = d.id
      WHERE ter.status = 'pending'
    `;
    
    let params = [];
    if (dispatcherId) {
      query += ' AND ter.dispatcher_id = ?';
      params.push(dispatcherId);
    }
    
    query += ' ORDER BY ter.created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  async findByPlayerId(playerId) {
    const query = `
      SELECT ter.*, 
             t.customer_name, 
             t.game_name, 
             t.duration as task_duration,
             d.username as dispatcher_name,
             r.username as reviewer_name
      FROM time_extension_requests ter
      LEFT JOIN tasks t ON ter.task_id = t.id
      LEFT JOIN users d ON ter.dispatcher_id = d.id
      LEFT JOIN users r ON ter.reviewed_by = r.id
      WHERE ter.player_id = ?
      ORDER BY ter.created_at DESC
    `;
    
    const [rows] = await pool.execute(query, [playerId]);
    return rows;
  }

  async update(id, data, connection = null) {
    const conn = connection || pool;
    
    const { status, reviewed_by, review_reason } = data;
    
    const query = `
      UPDATE time_extension_requests 
      SET status = ?, reviewed_by = ?, review_reason = ?, reviewed_at = NOW()
      WHERE id = ?
    `;
    
    const [result] = await conn.execute(query, [
      status, 
      reviewed_by, 
      review_reason || null, 
      id
    ]);
    
    return result.affectedRows > 0;
  }

  async deleteByTaskId(taskId, connection = null) {
    const conn = connection || pool;
    
    const query = 'DELETE FROM time_extension_requests WHERE task_id = ?';
    const [result] = await conn.execute(query, [taskId]);
    
    return result.affectedRows;
  }
}

export const extensionRepository = new ExtensionRepository();