import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { superAdminController } from '../controllers/super-admin.controller.js';

const router = express.Router();

// 用户创建验证规则
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度不能少于6个字符'),
  body('role')
    .trim()
    .isIn(['player', 'dispatcher', 'super_admin'])
    .withMessage('角色必须是 player, dispatcher 或 super_admin'),
  body('status')
    .optional()
    .trim()
    .isIn(['idle', 'busy', 'offline'])
    .withMessage('状态必须是 idle, busy 或 offline')
];

// 用户更新验证规则
const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('role')
    .optional()
    .trim()
    .isIn(['player', 'dispatcher', 'admin'])
    .withMessage('角色必须是 player, dispatcher 或 admin'),
  body('status')
    .optional()
    .trim()
    .isIn(['idle', 'busy', 'offline'])
    .withMessage('状态必须是 idle, busy 或 offline'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值')
];

// 批量更新验证规则
const batchUpdateValidation = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('用户ID列表不能为空'),
  body('userIds.*')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),
  body('updates.role')
    .optional()
    .trim()
    .isIn(['player', 'dispatcher', 'admin'])
    .withMessage('角色必须是 player, dispatcher 或 admin'),
  body('updates.status')
    .optional()
    .trim()
    .isIn(['idle', 'busy', 'offline'])
    .withMessage('状态必须是 idle, busy 或 offline'),
  body('updates.is_active')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值')
];

// 密码重置验证规则
const resetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度不能少于6个字符')
];

// 数据导出验证规则
const exportValidation = [
  body('format')
    .optional()
    .trim()
    .isIn(['json', 'csv'])
    .withMessage('导出格式必须是 json 或 csv')
];

// 所有路由都需要超级管理员权限
router.use(authenticateToken, requireSuperAdmin);

// 用户管理路由
router.get('/users', superAdminController.getAllUsers); // 获取所有用户
router.post('/users', createUserValidation, superAdminController.createUser); // 创建用户
router.get('/users/:id', superAdminController.getUserDetails); // 获取用户详情
router.put('/users/:id', updateUserValidation, superAdminController.updateUser); // 更新用户
router.delete('/users/:id', superAdminController.deleteUser); // 删除用户

// 批量操作路由
router.put('/users/batch', batchUpdateValidation, superAdminController.batchUpdateUsers); // 批量更新用户
router.post('/users/:id/reset-password', resetPasswordValidation, superAdminController.resetUserPassword); // 重置用户密码

// 用户活动日志
router.get('/users/:id/activity', superAdminController.getUserActivity); // 获取用户活动日志

// 数据导出
router.post('/export/users', exportValidation, superAdminController.exportUserData); // 导出用户数据

// 系统概览
router.get('/system/overview', superAdminController.getSystemOverview); // 获取系统概览

export default router;