import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private readonly heartbeatIntervalMs = 30000; // 30秒心跳间隔
  private readonly heartbeatTimeoutMs = 10000; // 10秒心跳超时
  private isHeartbeatActive = false;
  private lastActivity = Date.now();

  connect(): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = Cookies.get('token');
    if (!token) {
      console.warn('No token available for socket connection');
      return null;
    }

    const serverUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
    
    this.socket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.updateActivity();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.stopHeartbeat();
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.socket?.disconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.updateActivity();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.stopHeartbeat();
    });

    // 设置心跳响应监听
    this.socket.on('pong', () => {
      console.log('Received pong from server');
      this.handleHeartbeatResponse();
      this.updateActivity();
    });

    // 监听所有事件以更新活动时间
    const originalOn = this.socket.on.bind(this.socket);
    this.socket.on = ((event: string, listener: (...args: unknown[]) => void) => {
      const wrappedListener = (...args: unknown[]) => {
        this.updateActivity();
        return listener(...args);
      };
      return originalOn(event, wrappedListener);
    }) as typeof this.socket.on;
  }

  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 心跳管理方法
  private startHeartbeat() {
    if (this.isHeartbeatActive || !this.socket?.connected) {
      return;
    }

    this.isHeartbeatActive = true;
    console.log('Starting heartbeat');

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket?.connected) {
        this.stopHeartbeat();
        return;
      }

      // 检查是否长时间无活动
      const now = Date.now();
      const inactiveTime = now - this.lastActivity;
      const fiveMinutes = 5 * 60 * 1000;

      if (inactiveTime > fiveMinutes) {
        console.log('Long idle detected, sending heartbeat ping');
      }

      // 发送心跳
      this.socket.emit('ping');
      console.log('Sent ping to server');

      // 设置心跳超时
      this.heartbeatTimeout = setTimeout(() => {
        console.warn('Heartbeat timeout, connection may be lost');
        this.handleHeartbeatTimeout();
      }, this.heartbeatTimeoutMs);

    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (!this.isHeartbeatActive) {
      return;
    }

    console.log('Stopping heartbeat');
    this.isHeartbeatActive = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleHeartbeatResponse() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleHeartbeatTimeout() {
    console.error('Heartbeat timeout - attempting reconnection');
    
    // 清理超时定时器
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    // 尝试重新连接
    if (this.socket) {
      this.socket.disconnect();
      // Socket.IO会自动尝试重连
    }
  }

  private updateActivity() {
    this.lastActivity = Date.now();
  }

  // 公共方法：检查连接健康状态
  getConnectionHealth(): { isConnected: boolean; lastActivity: number; inactiveTime: number } {
    const now = Date.now();
    return {
      isConnected: this.isConnected(),
      lastActivity: this.lastActivity,
      inactiveTime: now - this.lastActivity
    };
  }

  // 公共方法：强制重连
  forceReconnect() {
    console.log('Force reconnecting socket...');
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      // 清除现有socket
      this.socket = null;
    }
    // 重新连接
    this.connect();
  }

  // Task-related events
  onTaskCreated(callback: (task: unknown) => void) {
    this.socket?.on('task_created', callback);
  }

  onTaskUpdated(callback: (task: unknown) => void) {
    this.socket?.on('task_updated', callback);
  }

  onTaskAccepted(callback: (task: unknown) => void) {
    this.socket?.on('task_accepted', callback);
  }

  onTaskStarted(callback: (task: unknown) => void) {
    this.socket?.on('task_started', callback);
  }

  onTaskCompleted(callback: (task: unknown) => void) {
    this.socket?.on('task_completed', callback);
  }

  onTaskCancelled(callback: (task: unknown) => void) {
    this.socket?.on('task_cancelled', callback);
  }

  // User-related events
  onUserStatusChanged(callback: (data: { userId: number; status: string }) => void) {
    this.socket?.on('user_status_changed', callback);
  }

  onUserOnline(callback: (data: { userId: number; username: string }) => void) {
    this.socket?.on('user_online', callback);
  }

  onUserOffline(callback: (data: { userId: number; username: string }) => void) {
    this.socket?.on('user_offline', callback);
  }

  // Notification events
  onNotification(callback: (notification: unknown) => void) {
    this.socket?.on('notification', callback);
  }

  // Remove event listeners
  off(event: string, callback?: (...args: unknown[]) => void) {
    this.socket?.off(event, callback);
  }

  // Join rooms
  joinRoom(room: string) {
    this.socket?.emit('join_room', room);
  }

  leaveRoom(room: string) {
    this.socket?.emit('leave_room', room);
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Hook for using socket in React components
export const useSocket = () => {
  return socketManager;
};