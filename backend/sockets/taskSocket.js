
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { extensionRepository } from '../repositories/extension.repository.js';
import { userService } from '../services/user.service.js';
import logger from '../utils/logger.js';

const connectedUsers = new Map();

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error', { error: error.message });
    next(new Error('Authentication error: Invalid token'));
  }
}

export function handleSocketConnection(socket, io) {
  authenticateSocket(socket, (error) => {
    if (error) {
      logger.error('Socket connection rejected', { error: error.message });
      socket.disconnect();
      return;
    }

    const user = socket.user;
    logger.info(`✅ User connected: ${user.username} (${user.role})`, { userId: user.id, socketId: socket.id });

    connectedUsers.set(user.id, { socketId: socket.id, user: user });

    if (user.role === 'dispatcher') socket.join('dispatchers');
    if (user.role === 'player') socket.join(['players', `player_${user.id}`]);

    socket.emit('connected', { message: 'Connection successful', user: user });

    socket.to('dispatchers').emit('user_online', { ...user });

    handleTaskEvents(socket, io);

    socket.on('disconnect', async () => {
      logger.info(`❌ User disconnected: ${user.username}`, { userId: user.id });
      try {
        await userService.updateUserStatus(user.id, 'offline');
        connectedUsers.delete(user.id);
        socket.to('dispatchers').emit('user_offline', { userId: user.id, username: user.username, status: 'offline' });
      } catch (err) {
        logger.error('Error handling disconnect', { error: err, userId: user.id });
      }
    });

    socket.on('ping', () => socket.emit('pong'));
  });
}

function handleTaskEvents(socket, io) {
  const user = socket.user;

  const broadcastTaskStatusChange = async (taskId, eventName = 'task_status_changed') => {
    try {
      const task = await taskRepository.findById(taskId);
      if (task) {
        io.to('dispatchers').to(`player_${task.player_id}`).emit(eventName, task);
        logger.info(`Broadcasted [${eventName}] for task ${taskId}`);
      }
    } catch (error) {
      logger.error(`Failed to broadcast event ${eventName} for task ${taskId}`, { error });
    }
  };

  const broadcastExtensionEvent = async (requestId, eventName) => {
    try {
      const request = await extensionRepository.findById(requestId);
      if (request) {
        // 向派单员和相关陪玩员发送事件
        io.to('dispatchers').to(`player_${request.player_id}`).emit(eventName, request);
        logger.info(`Broadcasted [${eventName}] for extension request ${requestId}`);
      }
    } catch (error) {
      logger.error(`Failed to broadcast event ${eventName} for extension request ${requestId}`, { error });
    }
  };

  socket.on('task_created', (data) => broadcastTaskStatusChange(data.taskId, 'new_task'));
  socket.on('task_accepted', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_started', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_completed', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_cancelled', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_updated', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_paused', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_resumed', (data) => broadcastTaskStatusChange(data.taskId));
  
  // 时间延长相关事件
  socket.on('extension_requested', (data) => broadcastExtensionEvent(data.requestId, 'extension_requested'));
  socket.on('extension_reviewed', (data) => broadcastExtensionEvent(data.requestId, 'extension_reviewed'));
  socket.on('duration_extended', (data) => broadcastTaskStatusChange(data.taskId, 'duration_extended'));

  socket.on('status_changed', (data) => {
    io.to('dispatchers').emit('player_status_changed', { userId: user.id, username: user.username, status: data.status });
  });

  socket.on('get_online_users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(conn => conn.user);
    socket.emit('online_users', onlineUsers);
  });
}
