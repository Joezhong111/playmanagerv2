import { pool } from '../config/database.js';
import crypto from 'crypto';

// 会话管理中间件
export class SessionManager {
  // 创建用户会话
  static async createSession(userId, token, expiresAt) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // 先清理该用户的旧会话
      await this.invalidateUserSessions(userId);
      
      const [result] = await pool.execute(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at) 
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  // 验证会话有效性
  static async validateSession(userId, token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const [sessions] = await pool.execute(
        `SELECT id, user_id, expires_at, is_active 
         FROM user_sessions 
         WHERE user_id = ? AND token_hash = ? AND is_active = TRUE AND expires_at > NOW()`,
        [userId, tokenHash]
      );
      
      if (sessions.length === 0) {
        return false;
      }
      
      // 更新最后活动时间
      await pool.execute(
        `UPDATE user_sessions SET last_activity = NOW() WHERE id = ?`,
        [sessions[0].id]
      );
      
      return true;
    } catch (error) {
      console.error('验证会话失败:', error);
      return false;
    }
  }

  // 使指定用户的所有会话失效
  static async invalidateUserSessions(userId) {
    try {
      await pool.execute(
        `UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?`,
        [userId]
      );
    } catch (error) {
      console.error('失效用户会话失败:', error);
      throw error;
    }
  }

  // 使单个会话失效
  static async invalidateSession(sessionId) {
    try {
      await pool.execute(
        `UPDATE user_sessions SET is_active = FALSE WHERE id = ?`,
        [sessionId]
      );
    } catch (error) {
      console.error('失效会话失败:', error);
      throw error;
    }
  }

  // 清理过期会话
  static async cleanupExpiredSessions() {
    try {
      // 标记过期会话为非活跃
      await pool.execute(
        `UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW()`
      );
      
      // 删除30天前的非活跃会话
      await pool.execute(
        `DELETE FROM user_sessions WHERE is_active = FALSE AND last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
      
      // 更新离线用户状态
      await pool.execute(
        `UPDATE users u
         LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
         SET u.status = 'offline'
         WHERE u.role = 'player' AND s.id IS NULL AND u.status != 'offline'`
      );
    } catch (error) {
      console.error('清理过期会话失败:', error);
      throw error;
    }
  }

  // 获取用户活跃会话数
  static async getActiveSessionCount(userId) {
    try {
      const [sessions] = await pool.execute(
        `SELECT COUNT(*) as count FROM user_sessions 
         WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW()`,
        [userId]
      );
      
      return sessions[0].count;
    } catch (error) {
      console.error('获取活跃会话数失败:', error);
      return 0;
    }
  }

  // 获取系统活跃用户数
  static async getSystemActiveUsers() {
    try {
      const [users] = await pool.execute(
        `SELECT DISTINCT u.id, u.username, u.role, u.status
         FROM users u
         INNER JOIN user_sessions s ON u.id = s.user_id 
         WHERE s.is_active = TRUE AND s.expires_at > NOW()`
      );
      
      return users;
    } catch (error) {
      console.error('获取系统活跃用户失败:', error);
      return [];
    }
  }
}

// 增强的JWT认证中间件（包含会话验证）
export async function authenticateTokenWithSession(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is missing' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // 验证会话有效性
    const isValidSession = await SessionManager.validateSession(decoded.userId, token);
    if (!isValidSession) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired or invalid' 
      });
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid access token' 
    });
  }
}

// 用户活跃状态检查中间件
export async function checkUserActivity(req, res, next) {
  try {
    if (req.user && req.user.userId) {
      const [users] = await pool.execute(
        `SELECT id, username, role, status, is_active FROM users WHERE id = ?`,
        [req.user.userId]
      );
      
      if (users.length > 0) {
        const user = users[0];
        
        // 检查用户是否被禁用
        if (!user.is_active) {
          return res.status(403).json({ 
            success: false, 
            message: 'User account is disabled' 
          });
        }
        
        req.currentUser = user;
      }
    }
    
    next();
  } catch (error) {
    console.error('用户活跃状态检查失败:', error);
    next();
  }
}