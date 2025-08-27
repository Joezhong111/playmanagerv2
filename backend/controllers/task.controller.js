
import { taskService } from '../services/task.service.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError.js';

// A helper to wrap async functions and catch errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class TaskController {

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

    res.status(200).json({
      success: true,
      message: 'Task accepted successfully',
      data: updatedTask
    });
  });

  startTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const playerId = req.user.userId;
    const updatedTask = await taskService.startTask(taskId, playerId);

    res.status(200).json({
      success: true,
      message: 'Task started successfully',
      data: updatedTask
    });
  });

  completeTask = asyncHandler(async (req, res, next) => {
    const taskId = req.params.id;
    const playerId = req.user.userId;
    const updatedTask = await taskService.completeTask(taskId, playerId);

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
