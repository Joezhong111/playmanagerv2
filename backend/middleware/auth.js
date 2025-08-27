import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// JWT认证中间件
export function authenticateToken(req, res, next) {
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
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid access token' 
    });
  }
}

// 角色验证中间件
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
}

// 管理员角色验证中间件
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin permissions required' 
    });
  }
  next();
}

// 用户存在性验证中间件
export async function validateUser(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.currentUser = users[0];
    next();
  } catch (error) {
    console.error('用户验证错误:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}