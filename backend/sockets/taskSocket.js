
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

    if (user.role === 'dispatcher') {
      socket.join('dispatchers');
      console.log(`[Socket] 派单员 ${user.username} 加入 dispatchers 房间`);
    }
    if (user.role === 'player') {
      socket.join(['players', `player_${user.id}`]);
      console.log(`[Socket] 陪玩员 ${user.username} 加入 players 和 player_${user.id} 房间`);
    }

    socket.emit('connected', { message: 'Connection successful', user: user });

    socket.to('dispatchers').emit('user_online', { ...user });

    handleTaskEvents(socket, io);

    socket.on('disconnect', async () => {
      logger.info(`❌ User disconnected: ${user.username}`, { userId: user.id });
      try {
        // 只有在用户是 idle 状态时才需要更新状态
        // 如果用户正在执行任务(busy)，不应该改变状态
        const currentUser = await userRepository.findById(user.id);
        if (currentUser && currentUser.status === 'idle') {
          console.log(`[Disconnect] 用户 ${user.id} 是空闲状态，保持 idle`);
          // 对于空闲用户，断开连接时保持 idle 状态
        } else if (currentUser && currentUser.status === 'busy') {
          console.log(`[Disconnect] 用户 ${user.id} 正在执行任务，保持 busy 状态`);
          // 对于忙碌用户，断开连接时不改变状态，因为他们可能在执行任务
        }
        
        connectedUsers.delete(user.id);
        socket.to('dispatchers').emit('user_offline', { userId: user.id, username: user.username, status: currentUser?.status || 'idle' });
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
        
        // 同步广播陪玩员状态变更
        if (task.player_id) {
          const player = await userRepository.findById(task.player_id);
          if (player) {
            io.to('dispatchers').emit('player_status_changed', { 
              userId: player.id, 
              username: player.username, 
              status: player.status 
            });
            logger.info(`Broadcasted player status change for user ${player.id}: ${player.status}`);
          }
        }
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

  socket.on('task_created', (data) => {
    console.log(`[Socket] 收到 task_created 事件: ${data.taskId}`);
    broadcastTaskStatusChange(data.taskId, 'new_task');
  });
  socket.on('task_accepted', (data) => {
    console.log(`[Socket] 收到 task_accepted 事件: ${data.taskId}`);
    broadcastTaskStatusChange(data.taskId);
  });
  socket.on('task_started', (data) => {
    console.log(`[Socket] 收到 task_started 事件: ${data.taskId}`);
    broadcastTaskStatusChange(data.taskId);
  });
  socket.on('task_completed', (data) => {
    console.log(`[Socket] 收到 task_completed 事件: ${data.taskId}`);
    broadcastTaskStatusChange(data.taskId);
  });
  socket.on('task_cancelled', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_updated', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_paused', (data) => broadcastTaskStatusChange(data.taskId));
  socket.on('task_resumed', (data) => broadcastTaskStatusChange(data.taskId));
  
  // 时间延长相关事件
  socket.on('extension_requested', (data) => broadcastExtensionEvent(data.requestId, 'extension_requested'));
  socket.on('extension_reviewed', (data) => broadcastExtensionEvent(data.requestId, 'extension_reviewed'));
  socket.on('duration_extended', (data) => broadcastTaskStatusChange(data.taskId, 'duration_extended'));
  
  // 排队任务相关事件
  socket.on('task_queued', (data) => {
    console.log(`[Socket] 收到 task_queued 事件: ${data.taskId}`);
    broadcastTaskStatusChange(data.taskId, 'task_queued');
  });
  socket.on('queue_updated', (data) => {
    console.log(`[Socket] 收到 queue_updated 事件，陪玩员: ${data.playerId}`);
    io.to('dispatchers').to(`player_${data.playerId}`).emit('task_queue_updated', data);
  });

  socket.on('status_changed', (data) => {
    io.to('dispatchers').emit('player_status_changed', { userId: user.id, username: user.username, status: data.status });
  });

  socket.on('get_online_users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(conn => conn.user);
    socket.emit('online_users', onlineUsers);
  });
}
