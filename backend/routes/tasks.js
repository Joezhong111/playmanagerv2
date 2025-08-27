
import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { taskController } from '../controllers/task.controller.js';
import { extensionController } from '../controllers/extension.controller.js';

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

// 时间延长相关路由 - 必须在 /:id 之前定义
router.get('/extension-requests', authenticateToken, extensionController.getExtensionRequests);
router.get('/extension-requests/my', authenticateToken, extensionController.getMyExtensionRequests);

router.get('/:id', authenticateToken, taskController.getTaskById);

router.put('/:id/accept', authenticateToken, requireRole('player'), taskController.acceptTask);

router.put('/:id/start', authenticateToken, requireRole('player'), taskController.startTask);

router.put('/:id/complete', authenticateToken, requireRole('player'), taskController.completeTask);

router.put('/:id/cancel', authenticateToken, taskController.cancelTask);

router.put('/:id/pause', authenticateToken, requireRole('player'), taskController.pauseTask);

router.put('/:id/resume', authenticateToken, requireRole('player'), taskController.resumeTask);

router.put('/:id', updateTaskChain, taskController.updateTask);

// 时间延长相关路由
const extensionRequestChain = [
  authenticateToken,
  requireRole('player'),
  body('requested_minutes').isInt({ min: 5, max: 480 }).withMessage('Requested minutes must be between 5 and 480 minutes'),
  body('reason').optional().trim().isLength({ max: 500 }).escape()
];

const reviewExtensionChain = [
  authenticateToken,
  requireRole('dispatcher'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('review_reason').optional().trim().isLength({ max: 500 }).escape()
];

const extendDurationChain = [
  authenticateToken,
  requireRole('dispatcher'),
  body('additional_minutes').isInt({ min: 5, max: 480 }).withMessage('Additional minutes must be between 5 and 480 minutes'),
  body('reason').optional().trim().isLength({ max: 500 }).escape()
];

// 其他时间延长API路由
router.post('/:id/request-extension', extensionRequestChain, extensionController.requestExtension);
router.put('/:id/extend-duration', extendDurationChain, extensionController.extendTaskDuration);
router.put('/extension-requests/:id/review', reviewExtensionChain, extensionController.reviewExtensionRequest);

export default router;
