import { taskRepository } from '../repositories/task.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import logger from '../utils/logger.js';

// 全局变量，用于在service中访问socket io实例
let globalIo = null;

export const setGlobalIo = (io) => {
  globalIo = io;
};

class OvertimeService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * 启动超时检测服务
   */
  start() {
    if (this.isRunning) {
      logger.warn('Overtime service is already running');
      return;
    }

    this.isRunning = true;
    
    // 每分钟检查一次超时任务
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkOvertimeTasks();
      } catch (error) {
        logger.error('Error checking overtime tasks:', error);
      }
    }, 60000); // 1分钟

    logger.info('Overtime service started');
  }

  /**
   * 停止超时检测服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    logger.info('Overtime service stopped');
  }

  /**
   * 检查超时任务
   */
  async checkOvertimeTasks() {
    try {
      const overtimeTasks = await taskRepository.findOvertimeTasks();
      
      if (overtimeTasks.length === 0) {
        return;
      }

      logger.info(`Found ${overtimeTasks.length} overtime tasks to process`);

      for (const task of overtimeTasks) {
        try {
          await this.processOvertimeTask(task);
        } catch (error) {
          logger.error(`Error processing overtime task ${task.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in checkOvertimeTasks:', error);
    }
  }

  /**
   * 处理单个超时任务
   */
  async processOvertimeTask(task) {
    try {
      // 更新任务状态为超时
      const updatedTask = await taskRepository.updateTaskStatus(task.id, 'overtime');
      
      if (updatedTask) {
        logger.info(`Task ${task.id} marked as overtime`, {
          taskId: task.id,
          player_id: task.player_id,
          customer_name: task.customer_name,
          overtime_at: task.overtime_at
        });

        // 发送Socket事件广播（不自动更改陪玩员状态）
        if (globalIo) {
          const taskDetails = await taskRepository.findById(task.id);
          if (taskDetails) {
            // 向派单员和相关陪玩员发送超时事件
            globalIo.to('dispatchers').to(`player_${taskDetails.player_id}`).emit('task_overtime', taskDetails);
            logger.info(`Broadcasted task_overtime event for task ${task.id}`);
          }
        }

        return updatedTask;
      }
    } catch (error) {
      logger.error(`Failed to process overtime task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * 手动检查特定任务是否超时
   */
  async checkTaskOvertime(taskId) {
    try {
      const task = await taskRepository.findById(taskId);
      
      if (!task || task.status !== 'in_progress' || !task.overtime_at) {
        return false;
      }

      const now = new Date();
      const overtimeAt = new Date(task.overtime_at);
      
      if (now > overtimeAt) {
        await this.processOvertimeTask(task);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error checking task overtime for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * 获取超时任务统计
   */
  async getOvertimeStats() {
    try {
      const stats = await taskRepository.getOvertimeStats();
      return stats;
    } catch (error) {
      logger.error('Error getting overtime stats:', error);
      throw error;
    }
  }
}

export const overtimeService = new OvertimeService();