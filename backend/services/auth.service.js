
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import { SessionManager } from '../middleware/session.js';
import { UnauthorizedError, ValidationError } from '../utils/AppError.js';

class AuthService {

  async login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Incorrect username or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Incorrect username or password');
    }

    // 检查用户是否被禁用
    if (!user.is_active) {
      throw new UnauthorizedError('User account is disabled');
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // 创建会话记录
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
    await SessionManager.createSession(user.id, token, expiresAt);

    // 更新用户状态为在线（如果是陪玩员）
    if (user.role === 'player') {
      await userRepository.updateStatus(user.id, 'idle');
    }

    // Don't send password back
    delete user.password;

    return { token, user };
  }

  async register(username, password, role) {
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await userRepository.create({ username, password: hashedPassword, role });

    return { userId, username, role };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      return user;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }

  async logout(userId, token) {
    // 使会话失效
    await SessionManager.invalidateUserSessions(userId);
    
    // 更新用户状态为离线（如果是陪玩员）
    const user = await userRepository.findById(userId);
    if (user && user.role === 'player') {
      await userRepository.updateStatus(userId, 'offline');
    }
    
    return { success: true, message: 'Logout successful' };
  }

  async checkUserOnlineStatus(userId) {
    const activeSessions = await SessionManager.getActiveSessionCount(userId);
    return activeSessions > 0;
  }
}

export const authService = new AuthService();
