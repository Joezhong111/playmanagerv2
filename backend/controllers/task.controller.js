
import { taskService } from '../services/task.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';

// A helper to wrap async functions and catch errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class TaskController {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  createTask = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const taskData = req.body;
    const dispatcherId = req.user.userId;
    const newTask = await taskService.createTask(taskData, dispatcherId);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  });

  getTasks = asyncHandler(async (req, res, next) => {
    const tasks = await taskService.getTasksForUser(req.query, req.user);
    res.status(200).json({
      success: true,
      data: tasks
    });
  });

  getTaskById = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const task = await taskService.getTaskByIdForUser(taskId, req.user);
    res.status(200).json({
      success: true,
      data: task
    });
  });

  acceptTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const playerId = req.user.userId;
    const updatedTask = await taskService.acceptTask(taskId, playerId);

    // 广播任务接受事件（不广播陪玩员状态变更，因为状态没有改变）
    if (this.io) {
      console.log(`[Controller] 广播任务接受事件给所有客户端`);
      this.io.to('dispatchers').to(`player_${updatedTask.player_id}`).emit('task_status_changed', updatedTask);
    }

    res.status(200).json({
      success: true,
      message: 'Task accepted successfully',
      data: updatedTask
    });
  });

  startTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const playerId = req.user.userId;
    console.log(`[Controller] 开始任务 ${taskId}，陪玩员 ${playerId}`);
    const updatedTask = await taskService.startTask(taskId, playerId);

    // 直接广播任务状态变更事件给所有相关客户端
    if (this.io) {
      console.log(`[Controller] 广播任务开始事件给所有客户端`);
      this.io.to('dispatchers').to(`player_${updatedTask.player_id}`).emit('task_status_changed', updatedTask);
      
      // 同时广播陪玩员状态变更
      const { userRepository } = await import('../repositories/user.repository.js');
      const player = await userRepository.findById(updatedTask.player_id);
      if (player) {
        // 同时发送给派单员和陪玩员本人
        this.io.to('dispatchers').to(`player_${player.id}`).emit('player_status_changed', { 
          userId: player.id, 
          username: player.username, 
          status: player.status 
        });
        console.log(`[Controller] 广播陪玩员 ${player.id} 状态变更: ${player.status} (发送给派单员和陪玩员本人)`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task started successfully',
      data: updatedTask
    });
  });

  completeTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const playerId = req.user.userId;
    console.log(`[Controller] 完成任务 ${taskId}，陪玩员 ${playerId}`);
    const updatedTask = await taskService.completeTask(taskId, playerId);

    // 直接广播任务状态变更事件给所有相关客户端
    if (this.io) {
      console.log(`[Controller] 广播任务完成事件给所有客户端`);
      this.io.to('dispatchers').to(`player_${updatedTask.player_id}`).emit('task_status_changed', updatedTask);
      
      // 同时广播陪玩员状态变更
      const { userRepository } = await import('../repositories/user.repository.js');
      const player = await userRepository.findById(updatedTask.player_id);
      if (player) {
        // 同时发送给派单员和陪玩员本人
        this.io.to('dispatchers').to(`player_${player.id}`).emit('player_status_changed', { 
          userId: player.id, 
          username: player.username, 
          status: player.status 
        });
        console.log(`[Controller] 广播陪玩员 ${player.id} 状态变更: ${player.status} (发送给派单员和陪玩员本人)`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      data: updatedTask
    });
  });

  cancelTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const cancellingUser = req.user;
    const updatedTask = await taskService.cancelTask(taskId, cancellingUser);

    res.status(200).json({
      success: true,
      message: 'Task cancelled successfully',
      data: updatedTask
    });
  });

  updateTask = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const taskId = req.params.id;
    const updateData = req.body;
    const user = req.user;

    const updatedTask = await taskService.updateTask(taskId, updateData, user);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  });

  pauseTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const user = req.user;
    const updatedTask = await taskService.pauseTask(taskId, user);

    res.status(200).json({
      success: true,
      message: 'Task paused successfully',
      data: updatedTask
    });
  });

  resumeTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const user = req.user;
    const updatedTask = await taskService.resumeTask(taskId, user);

    res.status(200).json({
      success: true,
      message: 'Task resumed successfully',
      data: updatedTask
    });
  });
}

export const taskController = new TaskController();
