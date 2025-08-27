import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

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
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.socket?.disconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });
  }

  disconnect() {
    if (this.socket) {
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

  // Task-related events
  onTaskCreated(callback: (task: any) => void) {
    this.socket?.on('task_created', callback);
  }

  onTaskUpdated(callback: (task: any) => void) {
    this.socket?.on('task_updated', callback);
  }

  onTaskAccepted(callback: (task: any) => void) {
    this.socket?.on('task_accepted', callback);
  }

  onTaskStarted(callback: (task: any) => void) {
    this.socket?.on('task_started', callback);
  }

  onTaskCompleted(callback: (task: any) => void) {
    this.socket?.on('task_completed', callback);
  }

  onTaskCancelled(callback: (task: any) => void) {
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
  onNotification(callback: (notification: any) => void) {
    this.socket?.on('notification', callback);
  }

  // Remove event listeners
  off(event: string, callback?: (...args: any[]) => void) {
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