
import { authService } from '../services/auth.service.js';
import { validationResult } from 'express-validator';
import { ValidationError, UnauthorizedError } from '../utils/AppError.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class AuthController {

  login = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Username and password are required');
    }

    const { username, password } = req.body;
    const { token, user } = await authService.login(username, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token, user }
    });
  });

  register = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { username, password, role } = req.body;
    const newUser = await authService.register(username, password, role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: newUser
    });
  });

  verify = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token is missing');
    }

    const user = await authService.verifyToken(token);

    res.status(200).json({
      success: true,
      data: { user }
    });
  });
}

export const authController = new AuthController();
