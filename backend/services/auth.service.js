
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
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

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

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
}

export const authService = new AuthService();
