
import { userService } from '../services/user.service.js';

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
}

export const userController = new UserController();
