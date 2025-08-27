import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

// JWT认证中间件
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '缺少访问令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '无效的访问令牌' });
  }
}

// 角色验证中间件
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 用户存在性验证中间件
export async function validateUser(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    req.currentUser = users[0];
    next();
  } catch (error) {
    console.error('用户验证错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}