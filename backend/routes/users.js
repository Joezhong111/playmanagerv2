
import express from 'express';
import { authenticateToken, validateUser } from '../middleware/auth.js';
import { userController } from '../controllers/user.controller.js';

const router = express.Router();

// All routes in this file are protected
router.use(authenticateToken);

router.get('/players/idle', userController.getIdlePlayers);

router.get('/players', userController.getAllPlayers);

// The validateUser middleware is used here to ensure the user exists before proceeding
router.put('/status', validateUser, userController.updateUserStatus);

router.get('/profile', validateUser, userController.getUserProfile);

export default router;
