
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
  authenticateSocket(socket, async (error) => {
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

    // 获取用户最新状态（简化验证，避免与登录逻辑冲突）
    const currentUser = await userRepository.findById(user.id);
    if (currentUser) {
      console.log(`[Connect] 用户 ${user.username} 连接，当前状态: ${currentUser.status}`);
      
      // 对于离线状态的陪玩员，自动设为空闲（表示重新上线）
      if (user.role === 'player' && currentUser.status === 'offline') {
        await userRepository.updateStatus(user.id, 'idle');
        console.log(`[Connect] 用户 ${user.username} 从 offline 重置为 idle (重新上线)`);
        
        // 广播状态变更事件
        socket.to('dispatchers').to(`player_${user.id}`).emit('player_status_changed', { 
          userId: user.id, 
          username: user.username, 
          status: 'idle',
          isOnline: true
        });
        console.log(`[Connect] 广播状态变更事件: ${user.username} -> idle (online)`);
      }
    }

    handleTaskEvents(socket, io);

    socket.on('disconnect', async () => {
      logger.info(`❌ User disconnected: ${user.username}`, { userId: user.id });
      try {
        // 获取用户当前状态
        const currentUser = await userRepository.findById(user.id);
        
        if (currentUser) {
          console.log(`[Disconnect] 用户 ${user.username} 断开连接，当前状态: ${currentUser.status}`);
          
          // 检查用户是否有进行中的任务
          const activeTask = await taskRepository.findActiveTaskByPlayer(user.id);
          
          // 只有空闲状态且没有活跃任务才更新为 offline
          // 如果用户有活跃任务，保持原状态（busy）
          if (currentUser.status === 'idle' && !activeTask) {
            await userRepository.updateStatus(user.id, 'offline');
            console.log(`[Disconnect] 用户 ${user.id} 从 idle 更新为 offline`);
          } else {
            console.log(`[Disconnect] 用户 ${user.id} 保持状态 ${currentUser.status} (活跃任务: ${!!activeTask})`);
          }
          
          // 通知派单员和陪玩员用户离线，但保留原始状态信息
          socket.to('dispatchers').to(`player_${user.id}`).emit('player_status_changed', { 
            userId: user.id, 
            username: user.username, 
            status: currentUser.status, // 保留原始状态
            isOnline: false
          });
        }
        
        connectedUsers.delete(user.id);
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
        
        // 同步广播陪玩员状态变更（只在必要时）
        if (task.player_id) {
          // 任务状态变更时，陪玩员状态通常已经由业务逻辑正确设置
          // 这里只广播，不进行额外的状态验证
          io.to('dispatchers').to(`player_${task.player_id}`).emit('player_status_changed', { 
            userId: task.player_id, 
            username: task.player_name || `玩家${task.player_id}`, 
            status: task.status === 'in_progress' || task.status === 'paused' || task.status === 'overtime' ? 'busy' : 'idle'
          });
          logger.info(`Broadcasted player status change for user ${task.player_id}: task ${task.status}`);
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
    // 发送给所有派单员和陪玩员自己
    io.to('dispatchers').to(`player_${user.id}`).emit('player_status_changed', { userId: user.id, username: user.username, status: data.status });
  });

  socket.on('get_online_users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(conn => conn.user);
    socket.emit('online_users', onlineUsers);
  });
}
