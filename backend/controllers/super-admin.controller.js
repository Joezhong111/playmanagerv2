import { superAdminService } from '../services/super-admin.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';
import { pool } from '../config/database.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class SuperAdminController {
  
  // 获取所有用户
  getAllUsers = asyncHandler(async (req, res, next) => {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 10
    };
    
    const result = await superAdminService.getAllUsers(filters);
    res.status(200).json({ 
      success: true, 
      data: result.users,
      pagination: result.pagination
    });
  });

  // 创建用户
  createUser = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const userData = req.body;
    const newUser = await superAdminService.createUser(userData);
    
    res.status(201).json({ 
      success: true, 
      message: '用户创建成功', 
      data: newUser 
    });
  });

  // 更新用户
  updateUser = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await superAdminService.updateUser(id, userData);
    
    res.status(200).json({ 
      success: true, 
      message: '用户更新成功', 
      data: updatedUser 
    });
  });

  // 删除用户
  deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const result = await superAdminService.deleteUser(id);
    
    res.status(200).json(result);
  });

  // 获取用户详情
  getUserDetails = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userDetails = await superAdminService.getUserDetails(id);
    
    res.status(200).json({ 
      success: true, 
      data: userDetails 
    });
  });

  // 批量更新用户
  batchUpdateUsers = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { userIds, updates } = req.body;
    const result = await superAdminService.batchUpdateUsers(userIds, updates);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  });

  // 重置用户密码
  resetUserPassword = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    const result = await superAdminService.resetUserPassword(id, newPassword);
    
    res.status(200).json(result);
  });

  // 获取系统概览
  getSystemOverview = asyncHandler(async (req, res, next) => {
    const overview = await superAdminService.getSystemOverview();
    
    res.status(200).json({ 
      success: true, 
      data: overview 
    });
  });

  // 获取用户活动日志
  getUserActivity = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 获取用户任务日志
    const [taskLogs] = await pool.execute(
      `SELECT tl.*, t.customer_name, t.game_name
       FROM task_logs tl
       LEFT JOIN tasks t ON tl.task_id = t.id
       WHERE tl.user_id = ?
       ORDER BY tl.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), (page - 1) * parseInt(limit)]
    );
    
    // 获取总数
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM task_logs WHERE user_id = ?',
      [id]
    );
    
    res.status(200).json({
      success: true,
      data: taskLogs,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  });

  // 导出用户数据
  exportUserData = asyncHandler(async (req, res, next) => {
    const { format = 'json', filters = {} } = req.body;
    
    const userData = await superAdminService.getAllUsers({
      ...filters,
      limit: 10000 // 导出时获取更多数据
    });
    
    if (format === 'csv') {
      // 转换为CSV格式
      const csvHeader = 'ID,用户名,角色,状态,激活状态,创建时间,最后登录,登录次数,总任务数,完成任务数,总收入\n';
      const csvRows = userData.users.map(user => 
        `${user.id},${user.username},${user.role},${user.status},${user.is_active},${user.created_at},${user.last_login_at || ''},${user.login_count},${user.total_tasks || 0},${user.completed_tasks || 0},${user.total_earnings || 0}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.status(200).send(csvHeader + csvRows);
    } else {
      // JSON格式
      res.status(200).json({
        success: true,
        data: userData.users,
        exportedAt: new Date().toISOString()
      });
    }
  });
}

export const superAdminController = new SuperAdminController();