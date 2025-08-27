
import { pool } from '../config/database.js';
import { taskRepository } from '../repositories/task.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';

class TaskService {

  async createTask(taskData, dispatcherId) {
    const { player_id } = taskData;

    // 如果指定了陪玩员，验证是否存在
    let playerStatus = null;
    if (player_id) {
      const player = await userRepository.findById(player_id);
      if (!player) {
        throw new NotFoundError('Player not found');
      }
      if (player.role !== 'player') {
        throw new ValidationError('User is not a player');
      }
      playerStatus = player.status;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 根据陪玩员状态决定任务状态和排队信息
      let taskStatus, queueOrder = null, queuedAt = null;
      
      if (!player_id) {
        taskStatus = 'pending';
      } else if (playerStatus === 'idle') {
        taskStatus = 'accepted';
      } else if (playerStatus === 'busy') {
        taskStatus = 'queued';
        // 获取该陪玩员当前的最大队列顺序
        const [queueResult] = await connection.execute(
          'SELECT MAX(queue_order) as max_order FROM tasks WHERE player_id = ? AND status = "queued"',
          [player_id]
        );
        queueOrder = (queueResult[0]?.max_order || 0) + 1;
        queuedAt = new Date();
      }

      const fullTaskData = { 
        ...taskData, 
        dispatcher_id: dispatcherId, 
        status: taskStatus,
        queue_order: queueOrder,
        queued_at: queuedAt
      };

      const taskId = await taskRepository.create(connection, fullTaskData);

      if (player_id && taskStatus === 'accepted') {
        // 只有立即接受的任务才记录接受时间
        await taskRepository.update(taskId, { accepted_at: new Date() }, connection);
      }

      const action = player_id ? 'create_and_assign' : 'create';
      await taskRepository.log(taskId, dispatcherId, action, { ...taskData, status: taskStatus }, connection);

      await connection.commit();

      const newTask = await taskRepository.findById(taskId);
      return newTask;

    } catch (error) {
      await connection.rollback();
      throw error; // Re-throw to be caught by the global error handler
    } finally {
      connection.release();
    }
  }

  async getTasksForUser(queryParams, user) {
    const { status, player_id } = queryParams;
    const { userId, role } = user;

    let query = `
      SELECT t.*, 
             d.username as dispatcher_name,
             p.username as player_name
      FROM tasks t
      LEFT JOIN users d ON t.dispatcher_id = d.id
      LEFT JOIN users p ON t.player_id = p.id
      WHERE 1=1
    `;
    let params = [];

    if (role === 'dispatcher') {
      query += ' AND t.dispatcher_id = ?';
      params.push(userId);
    } else if (role === 'player') {
      query += ' AND (t.player_id = ? OR t.player_id IS NULL)';
      params.push(userId);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (player_id) {
      query += ' AND t.player_id = ?';
      params.push(player_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const tasks = await taskRepository.find(query, params);
    return tasks;
  }

  async getTaskByIdForUser(taskId, user) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task');
    }
    // 权限检查：只有相关用户才能查看任务详情
    if (task.dispatcher_id !== user.userId && task.player_id !== user.userId) {
      throw new ForbiddenError('You do not have permission to view this task');
    }
    return task;
  }

  async acceptTask(taskId, playerId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const task = await taskRepository.findById(taskId, connection);
      if (!task || task.status !== 'pending') {
        throw new ValidationError('Task does not exist or has already been processed');
      }

      if (task.player_id && task.player_id !== playerId) {
        throw new ForbiddenError('This task has been assigned to another player');
      }

      await taskRepository.update(taskId, { status: 'accepted', player_id: playerId, accepted_at: new Date() }, connection);
      // 接受任务时不改变用户状态，只有开始任务时才变busy
      await taskRepository.log(taskId, playerId, 'accept', null, connection);

      await connection.commit();

      const updatedTask = await taskRepository.findById(taskId);
      return updatedTask;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async startTask(taskId, playerId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const task = await taskRepository.findById(taskId, connection);
      if (!task || task.status !== 'accepted') {
        throw new ValidationError('Task cannot be started');
      }
      if (task.player_id !== playerId) {
        throw new ForbiddenError('You are not assigned to this task');
      }

      // 确保陪玩员状态为忙碌
      console.log(`[startTask] 更新陪玩员 ${playerId} 状态为 busy`);
      await userRepository.updateStatus(playerId, 'busy', connection);
      await taskRepository.update(taskId, { status: 'in_progress', started_at: new Date() }, connection);
      await taskRepository.log(taskId, playerId, 'start', null, connection);

      await connection.commit();

      const updatedTask = await taskRepository.findById(taskId);
      return updatedTask;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async completeTask(taskId, playerId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const task = await taskRepository.findById(taskId, connection);
      if (!task || task.status !== 'in_progress') {
        throw new ValidationError('Task cannot be completed');
      }
      if (task.player_id !== playerId) {
        throw new ForbiddenError('You are not assigned to this task');
      }

      await taskRepository.update(taskId, { status: 'completed', completed_at: new Date() }, connection);
      console.log(`[completeTask] 更新陪玩员 ${playerId} 状态为 idle`);
      await userRepository.updateStatus(playerId, 'idle', connection);
      await taskRepository.log(taskId, playerId, 'complete', null, connection);

      // 自动激活下一个排队任务
      const nextQueuedTask = await taskRepository.getNextQueuedTask(playerId, connection);
      if (nextQueuedTask) {
        console.log(`[completeTask] 自动激活下一个排队任务 ${nextQueuedTask.id}`);
        await taskRepository.update(
          nextQueuedTask.id, 
          { 
            status: 'accepted', 
            accepted_at: new Date(),
            queue_order: null,
            queued_at: null
          }, 
          connection
        );
        await taskRepository.log(nextQueuedTask.id, playerId, 'auto_accept_from_queue', { previousTaskId: taskId }, connection);
      }

      await connection.commit();

      const updatedTask = await taskRepository.findById(taskId);
      return { completedTask: updatedTask, nextTask: nextQueuedTask };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async cancelTask(taskId, cancellingUser) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const task = await taskRepository.findById(taskId, connection);
      if (!task) {
        throw new NotFoundError('Task');
      }

      // Only dispatcher or assigned player can cancel
      if (task.dispatcher_id !== cancellingUser.userId && task.player_id !== cancellingUser.userId) {
        throw new ForbiddenError('You do not have permission to cancel this task');
      }

      if (['completed', 'cancelled'].includes(task.status)) {
        throw new ValidationError(`Task is already ${task.status} and cannot be cancelled`);
      }

      // If task was assigned, free up the player
      if (task.player_id && ['accepted', 'in_progress'].includes(task.status)) {
        await userRepository.updateStatus(task.player_id, 'idle', connection);
      }

      await taskRepository.update(taskId, { status: 'cancelled' }, connection);
      await taskRepository.log(taskId, cancellingUser.userId, 'cancel', { oldStatus: task.status }, connection);

      await connection.commit();

      const updatedTask = await taskRepository.findById(taskId);
      return updatedTask;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateTask(taskId, updateData, user) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const task = await taskRepository.findById(taskId, connection);
      if (!task) {
        throw new NotFoundError('Task');
      }

      // Only the original dispatcher can edit the task
      if (task.dispatcher_id !== user.userId) {
        throw new ForbiddenError('You do not have permission to edit this task');
      }

      // For simplicity, we only allow editing pending tasks. This could be expanded.
      if (task.status !== 'pending') {
        throw new ValidationError('Only pending tasks can be edited');
      }

      await taskRepository.update(taskId, updateData, connection);
      await taskRepository.log(taskId, user.userId, 'update', { updatedFields: Object.keys(updateData) }, connection);

      await connection.commit();

      const updatedTask = await taskRepository.findById(taskId);
      return updatedTask;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async pauseTask(taskId, user) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task');
    }
    if (task.player_id !== user.userId) {
      throw new ForbiddenError('You are not assigned to this task');
    }
    if (task.status !== 'in_progress') {
      throw new ValidationError('Only in-progress tasks can be paused');
    }

    await taskRepository.update(taskId, { status: 'paused' });
    await taskRepository.log(taskId, user.userId, 'pause', { oldStatus: task.status });

    return await taskRepository.findById(taskId);
  }

  async resumeTask(taskId, user) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task');
    }
    if (task.player_id !== user.userId) {
      throw new ForbiddenError('You are not assigned to this task');
    }
    if (task.status !== 'paused') {
      throw new ValidationError('Only paused tasks can be resumed');
    }

    await taskRepository.update(taskId, { status: 'in_progress' });
    await taskRepository.log(taskId, user.userId, 'resume', { oldStatus: task.status });

    return await taskRepository.findById(taskId);
  }
}

export const taskService = new TaskService();
