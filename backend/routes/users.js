
import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, validateUser, requireAdmin } from '../middleware/auth.js';
import { userController } from '../controllers/user.controller.js';

const router = express.Router();

const updateStatusValidation = [
  body('status')
    .trim()
    .isIn(['idle', 'busy', 'offline'])
    .withMessage('Status must be one of: idle, busy, offline')
];

// All routes in this file are protected
router.use(authenticateToken);

// Routes for players and general user info
router.get('/players/idle', userController.getIdlePlayers);
router.get('/players', userController.getAllPlayers);
router.get('/players/details', userController.getPlayerDetails);
router.put('/status', updateStatusValidation, validateUser, userController.updateUserStatus);
router.get('/profile', validateUser, userController.getUserProfile);

// --- Admin Routes ---
// These routes are for managing all users and require admin privileges.
router.get('/', requireAdmin, userController.getAllUsers); // Get all users (admin only)
router.get('/:id', requireAdmin, userController.getUserById); // Get a single user by ID (admin only)
router.put('/:id', requireAdmin, userController.updateUser); // Update a user (admin only)
router.delete('/:id', requireAdmin, userController.deleteUser); // Delete a user (admin only)

export default router;
