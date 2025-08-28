'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketManager } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Task, User } from '@/types/api';

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: User[];
  notifications: Notification[];
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read?: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const socket = socketManager.connect();
      
      if (socket) {
        // Connection status
        socket.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        // Task events
        socket.on('task_created', (task: Task) => {
          console.log('New task created:', task);
          if (user.role === 'player' && task.status === 'pending') {
            toast.success(`新任务：${task.game_name} - ${task.game_mode}`);
            addNotification({
              id: `task-created-${task.id}`,
              title: '新任务发布',
              message: `${task.game_name} - ${task.game_mode}，价格：¥${task.price}`,
              type: 'info',
              timestamp: new Date(),
            });
          }
        });

        socket.on('task_accepted', (task: Task) => {
          console.log('Task accepted:', task);
          if (user.role === 'dispatcher' && task.dispatcher_id === user.id) {
            toast.success(`任务被接受：${task.game_name}`);
            addNotification({
              id: `task-accepted-${task.id}`,
              title: '任务被接受',
              message: `${task.game_name} 已被陪玩员接受`,
              type: 'success',
              timestamp: new Date(),
            });
          }
        });

        socket.on('task_started', (task: Task) => {
          console.log('Task started:', task);
          if (user.role === 'dispatcher' && task.dispatcher_id === user.id) {
            toast.info(`任务开始：${task.game_name}`);
            addNotification({
              id: `task-started-${task.id}`,
              title: '任务开始',
              message: `${task.game_name} 已开始执行`,
              type: 'info',
              timestamp: new Date(),
            });
          }
        });

        socket.on('task_completed', (task: Task) => {
          console.log('Task completed:', task);
          if (user.role === 'dispatcher' && task.dispatcher_id === user.id) {
            toast.success(`任务完成：${task.game_name}`);
            addNotification({
              id: `task-completed-${task.id}`,
              title: '任务完成',
              message: `${task.game_name} 已成功完成`,
              type: 'success',
              timestamp: new Date(),
            });
          } else if (user.role === 'player' && task.player_id === user.id) {
            toast.success('恭喜！任务完成，收入已到账');
          }
        });

        socket.on('task_cancelled', (task: Task) => {
          console.log('Task cancelled:', task);
          if (task.player_id === user.id || (user.role === 'dispatcher' && task.dispatcher_id === user.id)) {
            toast.warning(`任务已取消：${task.game_name}`);
            addNotification({
              id: `task-cancelled-${task.id}`,
              title: '任务取消',
              message: `${task.game_name} 已被取消`,
              type: 'warning',
              timestamp: new Date(),
            });
          }
        });

        // User status events - 统一处理用户状态变更
        socket.on('player_status_changed', (data: { userId: number; status: 'idle' | 'busy' | 'offline'; username: string; isOnline?: boolean }) => {
          console.log('Player status changed:', data);
          
          // 更新在线用户列表
          if (data.isOnline === true) {
            setOnlineUsers(prev => {
              const exists = prev.find(u => u.id === data.userId);
              if (!exists) {
                return [...prev, { id: data.userId, username: data.username, status: data.status } as User];
              } else {
                return prev.map(u => u.id === data.userId ? { ...u, status: data.status } : u);
              }
            });
          } else if (data.isOnline === false) {
            setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
          }
          
          // 显示状态变更通知（只对派单员显示）
          if (user.role === 'dispatcher' || user.role === 'super_admin') {
            if (data.isOnline === true) {
              const statusText = data.status === 'idle' ? '空闲' : data.status === 'busy' ? '忙碌' : '离线';
              toast.info(`${data.username} 已上线 (${statusText})`);
            } else if (data.isOnline === false) {
              toast.info(`${data.username} 已离线`);
            } else {
              // 只是状态变更，不是上线/离线
              const statusText = data.status === 'idle' ? '空闲' : data.status === 'busy' ? '忙碌' : '离线';
              toast.info(`${data.username} 状态更新为${statusText}`);
            }
          }
        });

        // 兼容旧的事件名称（逐步移除）
        socket.on('user_status_changed', (data: { userId: number; status: string; username: string }) => {
          console.log('User status changed (legacy):', data);
          // 转发到新的事件处理器
          socket.emit('player_status_changed', { ...data });
        });

        // General notifications
        socket.on('notification', (notification: unknown) => {
          console.log('Notification received:', notification);
          const notif = notification as {
            message?: string;
            description?: string;
            title?: string;
            type?: 'info' | 'success' | 'warning' | 'error';
          };
          toast(notif.message || '通知', {
            description: notif.description,
          });
          addNotification({
            id: `notification-${Date.now()}`,
            title: notif.title || '通知',
            message: notif.message || '',
            type: notif.type || 'info',
            timestamp: new Date(),
          });
        });

        // Join user-specific room
        socket.emit('join_room', `user_${user.id}`);
        
        // Join role-specific room
        socket.emit('join_room', `${user.role}s`);

        return () => {
          socket.off('connect');
          socket.off('disconnect');
          socket.off('task_created');
          socket.off('task_accepted');
          socket.off('task_started');
          socket.off('task_completed');
          socket.off('task_cancelled');
          socket.off('player_status_changed');
          socket.off('user_status_changed');
          socket.off('notification');
          socketManager.disconnect();
        };
      }
    } else {
      socketManager.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  };

  const joinRoom = (room: string) => {
    const socket = socketManager.getSocket();
    socket?.emit('join_room', room);
  };

  const leaveRoom = (room: string) => {
    const socket = socketManager.getSocket();
    socket?.emit('leave_room', room);
  };

  const value: SocketContextType = {
    isConnected,
    onlineUsers,
    notifications,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};