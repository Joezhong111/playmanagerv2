
import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository.js';
import { AppError, ValidationError } from '../utils/AppError.js';

class UserService {

  async getIdlePlayers() {
    // This is a simple query, but in a real app, you might have more complex logic here.
    return await userRepository.find({ role: 'player', status: 'idle' });
  }

  async getAllPlayers() {
    return await userRepository.findAllPlayersWithTaskCount();
  }

  async getAllPlayersWithDetails() {
    return await userRepository.findAllPlayersWithTaskCount();
  }

  async updateUserStatus(userId, status) {
    if (!['idle', 'busy', 'offline'].includes(status)) {
      throw new ValidationError('Invalid status value');
    }
    
    // 获取当前用户状态用于日志和验证
    const currentUser = await userRepository.findById(userId);
    console.log(`[UserService] 用户 ${currentUser?.username || userId} 状态更新: ${currentUser?.status} -> ${status}`);
    
    // 状态验证：如果设置为忙碌状态，检查是否有活跃任务
    if (status === 'busy' && currentUser?.role === 'player') {
      const { taskRepository } = await import('../repositories/task.repository.js');
      const activeTask = await taskRepository.findActiveTaskByPlayer(userId);
      if (!activeTask) {
        console.warn(`[UserService] 警告: 用户 ${currentUser.username} 没有活跃任务但被设置为忙碌状态`);
      }
    }
    
    return await userRepository.updateStatus(userId, status);
  }

  // 验证并重置用户状态（简化版，避免过度验证）
  async validateAndResetUserStatus(userId) {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    
    console.log(`[UserService] 验证用户 ${currentUser.username} 状态: ${currentUser.status}`);
    
    // 只在明显异常的情况下才重置状态
    if (currentUser.role === 'player') {
      const { taskRepository } = await import('../repositories/task.repository.js');
      const activeTask = await taskRepository.findActiveTaskByPlayer(userId);
      
      // 只处理明显的不一致：忙碌状态但没有活跃任务
      if (currentUser.status === 'busy' && !activeTask) {
        console.log(`[UserService] 用户 ${currentUser.username} 状态异常: busy但无活跃任务，重置为idle`);
        await userRepository.updateStatus(userId, 'idle');
        return { reset: true, from: currentUser.status, to: 'idle' };
      }
      
      // 其他情况保持原状，避免过度干预
      console.log(`[UserService] 用户 ${currentUser.username} 状态正常 (活跃任务: ${!!activeTask})`);
    }
    
    return { reset: false, status: currentUser.status };
  }

  async getUserProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    return user;
  }

  // --- Admin Service Methods ---

  async getAllUsers(queryParams) {
    // In a real app, you'd have more complex filtering/pagination logic
    return await userRepository.findAll(queryParams);
  }

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    return user;
  }

  async updateUser(userId, userData) {
    const { password, ...otherData } = userData;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      otherData.password = hashedPassword;
    }
    const result = await userRepository.update(userId, otherData);
    if (result.affectedRows === 0) {
        throw new AppError(404, 'NOT_FOUND', 'User not found or data is unchanged');
    }
    return await this.getUserById(userId); // Return the updated user data
  }

  async deleteUser(userId) {
    const result = await userRepository.delete(userId);
    if (result.affectedRows === 0) {
        throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    return { message: 'User deleted successfully' };
  }
}

export const userService = new UserService();
