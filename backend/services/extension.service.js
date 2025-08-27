import { pool } from '../config/database.js';
import { extensionRepository } from '../repositories/extension.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';

class ExtensionService {

  async requestExtension(taskId, playerId, data) {
    const { requested_minutes, reason } = data;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 验证任务存在且玩家有权限
      const task = await taskRepository.findById(taskId, connection);
      if (!task) {
        throw new NotFoundError('Task not found');
      }
      
      if (task.player_id !== playerId) {
        throw new ForbiddenError('You are not assigned to this task');
      }
      
      if (task.status !== 'in_progress') {
        throw new ValidationError('Only in-progress tasks can request time extension');
      }
      
      // 检查是否已有待审核的申请
      const pendingRequests = await extensionRepository.findByTaskId(taskId);
      const hasPendingRequest = pendingRequests.some(req => req.status === 'pending');
      
      if (hasPendingRequest) {
        throw new ValidationError('There is already a pending extension request for this task');
      }

      // 创建延长申请
      const requestId = await extensionRepository.create(connection, {
        task_id: taskId,
        player_id: playerId,
        dispatcher_id: task.dispatcher_id,
        requested_minutes,
        reason
      });

      // 记录日志
      await taskRepository.log(taskId, playerId, 'request_extension', { 
        requested_minutes,
        reason 
      }, connection);

      await connection.commit();

      // 返回完整的申请信息
      const newRequest = await extensionRepository.findById(requestId);
      return newRequest;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async reviewExtensionRequest(requestId, reviewerId, data) {
    const { status, review_reason } = data;
    
    if (!['approved', 'rejected'].includes(status)) {
      throw new ValidationError('Invalid review status');
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 获取延长申请
      const request = await extensionRepository.findById(requestId);
      if (!request) {
        throw new NotFoundError('Extension request not found');
      }
      
      if (request.status !== 'pending') {
        throw new ValidationError('Extension request has already been reviewed');
      }
      
      // 验证审核者权限（必须是派单员且是任务的创建者）
      const reviewer = await userRepository.findById(reviewerId);
      if (!reviewer || reviewer.role !== 'dispatcher') {
        throw new ForbiddenError('Only dispatchers can review extension requests');
      }
      
      if (request.dispatcher_id !== reviewerId) {
        throw new ForbiddenError('You can only review requests for your own tasks');
      }

      // 更新申请状态
      await extensionRepository.update(requestId, {
        status,
        reviewed_by: reviewerId,
        review_reason: review_reason || null
      }, connection);

      // 如果审核通过，更新任务时长
      if (status === 'approved') {
        const task = await taskRepository.findById(request.task_id, connection);
        const newDuration = task.duration + request.requested_minutes;
        
        await taskRepository.update(request.task_id, {
          duration: newDuration
        }, connection);
        
        // 记录任务时长变更日志
        await taskRepository.log(request.task_id, reviewerId, 'extend_duration', {
          old_duration: task.duration,
          new_duration: newDuration,
          added_minutes: request.requested_minutes,
          extension_request_id: requestId
        }, connection);
      }

      // 记录审核日志
      await taskRepository.log(request.task_id, reviewerId, `extension_${status}`, {
        extension_request_id: requestId,
        requested_minutes: request.requested_minutes,
        review_reason
      }, connection);

      await connection.commit();

      // 返回更新后的申请信息
      const updatedRequest = await extensionRepository.findById(requestId);
      return updatedRequest;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async extendTaskDuration(taskId, dispatcherId, data) {
    const { additional_minutes, reason } = data;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 验证任务和权限
      const task = await taskRepository.findById(taskId, connection);
      if (!task) {
        throw new NotFoundError('Task not found');
      }
      
      if (task.dispatcher_id !== dispatcherId) {
        throw new ForbiddenError('You can only extend your own tasks');
      }
      
      if (!['accepted', 'in_progress', 'paused'].includes(task.status)) {
        throw new ValidationError('Task cannot be extended in current status');
      }

      // 更新任务时长
      const newDuration = task.duration + additional_minutes;
      await taskRepository.update(taskId, {
        duration: newDuration
      }, connection);

      // 记录日志
      await taskRepository.log(taskId, dispatcherId, 'extend_duration_direct', {
        old_duration: task.duration,
        new_duration: newDuration,
        added_minutes: additional_minutes,
        reason
      }, connection);

      await connection.commit();

      // 返回更新后的任务信息
      const updatedTask = await taskRepository.findById(taskId);
      return updatedTask;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getExtensionRequests(userId, role, taskId = null) {
    if (role === 'dispatcher') {
      // 派单员查看自己任务的延长申请
      return await extensionRepository.findPendingRequests(userId);
    } else if (role === 'player') {
      if (taskId) {
        // 查看特定任务的延长申请
        const requests = await extensionRepository.findByTaskId(taskId);
        // 玩家只能看到自己的申请
        return requests.filter(req => req.player_id === userId);
      } else {
        // 查看自己的所有延长申请
        return await extensionRepository.findByPlayerId(userId);
      }
    }
    
    return [];
  }
}

export const extensionService = new ExtensionService();