
import { userRepository } from '../repositories/user.repository.js';
import { ValidationError } from '../utils/AppError.js';

class UserService {

  async getIdlePlayers() {
    // This is a simple query, but in a real app, you might have more complex logic here.
    return await userRepository.find({ role: 'player', status: 'idle' });
  }

  async getAllPlayers() {
    return await userRepository.findAllPlayersWithTaskCount();
  }

  async updateUserStatus(userId, status) {
    if (!['idle', 'busy', 'offline'].includes(status)) {
      throw new ValidationError('Invalid status value');
    }
    return await userRepository.updateStatus(userId, status);
  }

  async getUserProfile(userId) {
    return await userRepository.findById(userId);
  }
}

export const userService = new UserService();
