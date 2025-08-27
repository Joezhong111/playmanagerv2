
import { userService } from '../services/user.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class UserController {

  getIdlePlayers = asyncHandler(async (req, res, next) => {
    const players = await userService.getIdlePlayers();
    res.status(200).json({ success: true, data: players });
  });

  getAllPlayers = asyncHandler(async (req, res, next) => {
    const players = await userService.getAllPlayers();
    res.status(200).json({ success: true, data: players });
  });

  updateUserStatus = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { status } = req.body;
    const userId = req.user.userId;
    await userService.updateUserStatus(userId, status);
    res.status(200).json({ 
      success: true, 
      message: 'Status updated successfully', 
      data: { status } 
    });
  });

  getUserProfile = asyncHandler(async (req, res, next) => {
    // req.currentUser is attached by validateUser middleware, but we can also fetch it via service
    const user = await userService.getUserProfile(req.user.userId);
    res.status(200).json({ success: true, data: user });
  });

  // --- Admin Controller Methods ---

  getAllUsers = asyncHandler(async (req, res, next) => {
    const users = await userService.getAllUsers(req.query); // Pass query for filtering
    res.status(200).json({ success: true, data: users });
  });

  getUserById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.status(200).json({ success: true, data: user });
  });

  updateUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await userService.updateUser(id, userData);
    res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
  });

  deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  });
}

export const userController = new UserController();
