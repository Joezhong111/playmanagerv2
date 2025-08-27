
import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { taskController } from '../controllers/task.controller.js';

const router = express.Router();

// Middleware chain for creating a task
const createTaskChain = [
  authenticateToken,
  requireRole('dispatcher'),
  body('customer_name').trim().isLength({ min: 1, max: 100 }).withMessage('Customer name is required').escape(),
  body('customer_contact').trim().isLength({ min: 1, max: 50 }).withMessage('Customer contact is required').escape(),
  body('game_name').trim().isLength({ min: 1, max: 100 }).withMessage('Game name is required').escape(),
  body('game_mode').trim().isLength({ min: 1, max: 100 }).withMessage('Game mode is required').escape(),
  body('duration').isInt({ min: 1, max: 1440 }).withMessage('Duration must be between 1 and 1440 minutes'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('requirements').optional().trim().isLength({ max: 1000 }).escape(),
  body('player_id').optional().isInt().withMessage('Player ID must be an integer')
];

const updateTaskChain = [
  authenticateToken,
  requireRole('dispatcher'),
  body('customer_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Customer name is required').escape(),
  body('customer_contact').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Customer contact is required').escape(),
  body('game_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Game name is required').escape(),
  body('game_mode').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Game mode is required').escape(),
  body('duration').optional().isInt({ min: 1, max: 1440 }).withMessage('Duration must be between 1 and 1440 minutes'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('requirements').optional().trim().isLength({ max: 1000 }).escape(),
  body('player_id').optional().isInt().withMessage('Player ID must be an integer')
];

// Define routes and link them to controller methods

router.post('/', createTaskChain, taskController.createTask);

router.get('/', authenticateToken, taskController.getTasks);

router.get('/:id', authenticateToken, taskController.getTaskById);

router.put('/:id/accept', authenticateToken, requireRole('player'), taskController.acceptTask);

router.put('/:id/start', authenticateToken, requireRole('player'), taskController.startTask);

router.put('/:id/complete', authenticateToken, requireRole('player'), taskController.completeTask);

router.put('/:id/cancel', authenticateToken, taskController.cancelTask);

router.put('/:id/pause', authenticateToken, requireRole('player'), taskController.pauseTask);

router.put('/:id/resume', authenticateToken, requireRole('player'), taskController.resumeTask);

router.put('/:id', updateTaskChain, taskController.updateTask);

export default router;
