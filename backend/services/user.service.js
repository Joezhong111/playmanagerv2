
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
    return await userRepository.updateStatus(userId, status);
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
