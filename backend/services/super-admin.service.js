import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';
import { SessionManager } from '../middleware/session.js';

class SuperAdminService {
  // 获取所有用户（超级管理员专用）
  async getAllUsers(filters = {}) {
    try {
      let query = `
        SELECT u.id, u.username, u.role, u.status, u.is_active, 
               u.created_at, u.updated_at, u.last_login_at, u.login_count,
               COUNT(DISTINCT t.id) as total_tasks,
               COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
               SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END) as total_earnings
        FROM users u
        LEFT JOIN tasks t ON u.id = t.player_id
        WHERE 1=1
      `;
      
      const params = [];
      
      // 角色过滤
      if (filters.role) {
        query += ' AND u.role = ?';
        params.push(filters.role);
      }
      
      // 状态过滤
      if (filters.status) {
        query += ' AND u.status = ?';
        params.push(filters.status);
      }
      
      // 激活状态过滤
      if (filters.is_active !== undefined) {
        query += ' AND u.is_active = ?';
        params.push(filters.is_active);
      }
      
      // 搜索过滤
      if (filters.search) {
        query += ' AND u.username LIKE ?';
        params.push(`%${filters.search}%`);
      }
      
      query += ' GROUP BY u.id ORDER BY u.created_at DESC';
      
      // 分页 - 简化处理，暂时不使用LIMIT
      // if (filters.page && filters.limit && filters.limit > 0) {
      //   const offset = (filters.page - 1) * filters.limit;
      //   query += ' LIMIT ? OFFSET ?';
      //   params.push(parseInt(filters.limit), parseInt(offset));
      // }
      
      const [users] = await pool.execute(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams = [];
      
      if (filters.role) {
        countQuery += ' AND role = ?';
        countParams.push(filters.role);
      }
      
      if (filters.status) {
        countQuery += ' AND status = ?';
        countParams.push(filters.status);
      }
      
      if (filters.is_active !== undefined) {
        countQuery += ' AND is_active = ?';
        countParams.push(filters.is_active);
      }
      
      if (filters.search) {
        countQuery += ' AND username LIKE ?';
        countParams.push(`%${filters.search}%`);
      }
      
      const [countResult] = await pool.execute(countQuery, countParams);
      
      return {
        users,
        pagination: {
          total: countResult[0].total,
          page: filters.page || 1,
          limit: filters.limit || 10,
          totalPages: Math.ceil(countResult[0].total / (filters.limit || 10))
        }
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  // 创建用户（超级管理员专用）
  async createUser(userData) {
    try {
      const { username, password, role, status = 'idle' } = userData;
      
      // 检查用户名是否已存在
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('用户名已存在');
      }
      
      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // 创建用户
      const [result] = await pool.execute(
        `INSERT INTO users (username, password, role, status, is_active) 
         VALUES (?, ?, ?, ?, TRUE)`,
        [username, hashedPassword, role, status]
      );
      
      // 获取创建的用户信息（不包含密码）
      const [newUser] = await pool.execute(
        'SELECT id, username, role, status, is_active, created_at FROM users WHERE id = ?',
        [result.insertId]
      );
      
      return newUser[0];
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  // 更新用户（超级管理员专用）
  async updateUser(userId, userData) {
    try {
      const { username, role, status, is_active } = userData;
      
      // 检查用户是否存在
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );
      
      if (existingUsers.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 检查用户名冲突（如果要修改用户名）
      if (username) {
        const [nameConflict] = await pool.execute(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [username, userId]
        );
        
        if (nameConflict.length > 0) {
          throw new Error('用户名已存在');
        }
      }
      
      // 构建更新语句
      const updateFields = [];
      const updateValues = [];
      
      if (username) {
        updateFields.push('username = ?');
        updateValues.push(username);
      }
      
      if (role) {
        updateFields.push('role = ?');
        updateValues.push(role);
      }
      
      if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段');
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);
      
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      await pool.execute(query, updateValues);
      
      // 如果用户被禁用，使其所有会话失效
      if (is_active === false) {
        await SessionManager.invalidateUserSessions(userId);
      }
      
      // 获取更新后的用户信息
      const [updatedUser] = await pool.execute(
        'SELECT id, username, role, status, is_active, updated_at FROM users WHERE id = ?',
        [userId]
      );
      
      return updatedUser[0];
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  // 删除用户（超级管理员专用）
  async deleteUser(userId) {
    try {
      // 检查用户是否存在
      const [existingUsers] = await pool.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [userId]
      );
      
      if (existingUsers.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = existingUsers[0];
      
      // 防止删除超级管理员
      if (user.role === 'super_admin') {
        throw new Error('不能删除超级管理员');
      }
      
      // 检查用户是否有进行中的任务
      const [activeTasks] = await pool.execute(
        'SELECT COUNT(*) as count FROM tasks WHERE player_id = ? AND status IN ("accepted", "in_progress")',
        [userId]
      );
      
      if (activeTasks[0].count > 0) {
        throw new Error('用户有进行中的任务，无法删除');
      }
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 使用户所有会话失效
        await connection.execute(
          'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
          [userId]
        );
        
        // 删除用户相关统计数据
        await connection.execute(
          'DELETE FROM user_statistics WHERE user_id = ?',
          [userId]
        );
        
        // 删除用户
        await connection.execute(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );
        
        await connection.commit();
        return { success: true, message: '用户删除成功' };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  // 批量更新用户状态（超级管理员专用）
  async batchUpdateUsers(userIds, updates) {
    try {
      const { status, is_active, role } = updates;
      
      // 验证用户ID
      const [validUsers] = await pool.execute(
        'SELECT id FROM users WHERE id IN (?)',
        [userIds]
      );
      
      const validIds = validUsers.map(user => user.id);
      const invalidIds = userIds.filter(id => !validIds.includes(id));
      
      if (validIds.length === 0) {
        throw new Error('没有有效的用户ID');
      }
      
      // 构建更新语句
      const updateFields = [];
      const updateValues = [];
      
      if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }
      
      if (role) {
        updateFields.push('role = ?');
        updateValues.push(role);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段');
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(...validIds);
      
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id IN (?)`;
      await pool.execute(query, updateValues);
      
      // 如果批量禁用用户，使相关会话失效
      if (is_active === false) {
        for (const userId of validIds) {
          await SessionManager.invalidateUserSessions(userId);
        }
      }
      
      return {
        success: true,
        message: `成功更新 ${validIds.length} 个用户`,
        updatedCount: validIds.length,
        invalidIds
      };
    } catch (error) {
      console.error('批量更新用户失败:', error);
      throw error;
    }
  }

  // 重置用户密码（超级管理员专用）
  async resetUserPassword(userId, newPassword) {
    try {
      // 检查用户是否存在
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );
      
      if (existingUsers.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 加密新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      await pool.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
      );
      
      // 使用户所有会话失效（强制重新登录）
      await SessionManager.invalidateUserSessions(userId);
      
      return { success: true, message: '密码重置成功' };
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  // 获取用户详细信息（超级管理员专用）
  async getUserDetails(userId) {
    try {
      // 获取基本信息
      const [users] = await pool.execute(
        `SELECT u.id, u.username, u.role, u.status, u.is_active, 
                u.created_at, u.updated_at, u.last_login_at, u.login_count
         FROM users u 
         WHERE u.id = ?`,
        [userId]
      );
      
      if (users.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = users[0];
      
      // 获取任务统计
      const [taskStats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_tasks,
           SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_earnings,
           AVG(CASE WHEN status = 'completed' THEN duration ELSE NULL END) as avg_duration
         FROM tasks 
         WHERE player_id = ?`,
        [userId]
      );
      
      // 获取今日统计
      const [todayStats] = await pool.execute(
        `SELECT 
           COUNT(*) as today_tasks,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as today_completed,
           SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as today_earnings
         FROM tasks 
         WHERE player_id = ? AND DATE(created_at) = CURDATE()`,
        [userId]
      );
      
      // 获取活跃会话数
      const activeSessions = await SessionManager.getActiveSessionCount(userId);
      
      return {
        ...user,
        taskStats: taskStats[0],
        todayStats: todayStats[0],
        activeSessions
      };
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  }

  // 获取系统统计概览（超级管理员专用）
  async getSystemOverview() {
    try {
      // 获取用户统计
      const [userStats] = await pool.execute(
        `SELECT 
           role,
           COUNT(*) as total,
           COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
           COUNT(CASE WHEN status = 'idle' THEN 1 END) as idle,
           COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy,
           COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline
         FROM users 
         GROUP BY role`
      );
      
      // 获取任务统计
      const [taskStats] = await pool.execute(
        `SELECT 
           status,
           COUNT(*) as count,
           SUM(price) as total_value
         FROM tasks 
         GROUP BY status`
      );
      
      // 获取今日统计
      const [todayStats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
           SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_revenue,
           COUNT(DISTINCT player_id) as active_players
         FROM tasks 
         WHERE DATE(created_at) = CURDATE()`
      );
      
      // 获取活跃用户数
      const activeUsers = await SessionManager.getSystemActiveUsers();
      
      return {
        userStats,
        taskStats,
        todayStats: todayStats[0],
        activeUsersCount: activeUsers.length
      };
    } catch (error) {
      console.error('获取系统概览失败:', error);
      throw error;
    }
  }
}

export const superAdminService = new SuperAdminService();