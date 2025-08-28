import { SessionManager } from '../middleware/session.js';

class SessionCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // 启动会话清理服务
  start() {
    if (this.isRunning) {
      console.log('会话清理服务已在运行');
      return;
    }

    console.log('启动会话清理服务...');
    
    // 立即执行一次清理
    this.cleanup();
    
    // 每5分钟执行一次清理
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5分钟

    this.isRunning = true;
    console.log('会话清理服务已启动，每5分钟执行一次清理');
  }

  // 停止会话清理服务
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('会话清理服务已停止');
  }

  // 执行清理操作
  async cleanup() {
    try {
      await SessionManager.cleanupExpiredSessions();
    } catch (error) {
      console.error('会话清理失败:', error);
    }
  }

  // 获取服务状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      lastCleanup: new Date().toISOString()
    };
  }
}

export const sessionCleanupService = new SessionCleanupService();