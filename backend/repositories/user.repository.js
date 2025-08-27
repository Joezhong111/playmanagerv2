
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
      'SELECT id, username, password, role, status FROM users WHERE username = ?',
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
      SELECT u.id, u.username, u.status, u.updated_at,
             COUNT(t.id) as active_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.player_id AND t.status IN ('accepted', 'in_progress')
      WHERE u.role = 'player'
      GROUP BY u.id, u.username, u.status, u.updated_at
      ORDER BY u.status ASC, u.updated_at DESC
    `);
    return rows;
  }

  async updateStatus(id, status, connection = pool) {
    const [result] = await connection.execute(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
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
