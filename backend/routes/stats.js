
import express from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { statsController } from '../controllers/stats.controller.js';

const router = express.Router();

// 统计路由现在仅对超级管理员开放
// 其他角色使用专门的统计路由
router.use(authenticateToken, requireSuperAdmin);

router.get('/tasks', statsController.getTaskStats);

router.get('/users', statsController.getUserStats);

export default router;
