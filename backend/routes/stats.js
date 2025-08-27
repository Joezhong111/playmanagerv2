
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { statsController } from '../controllers/stats.controller.js';

const router = express.Router();

// All stats routes are protected
router.use(authenticateToken);

router.get('/tasks', statsController.getTaskStats);

router.get('/users', statsController.getUserStats);

export default router;
