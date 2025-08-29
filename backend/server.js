import { config } from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { testConnection, validateTimezone, getPoolStatus } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/AppError.js';

// 路由导入
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import setupRoutes from './routes/setup.js';
import statsRoutes from './routes/stats.js';
import superAdminRoutes from './routes/super-admin.js';
import superAdminStatsRoutes from './routes/super-admin-stats.js';
import dispatcherStatsRoutes from './routes/dispatcher-stats.js';
import playerStatsRoutes from './routes/player-stats.js';
import gameDictionaryRoutes from './routes/game-dictionary.js';
import { taskController } from './controllers/task.controller.js';

// Socket处理导入
import { handleSocketConnection } from './sockets/taskSocket.js';

// 超时检测服务导入
import { overtimeService, setGlobalIo } from './services/overtime.service.js';
import { sessionCleanupService } from './services/session-cleanup.service.js';

config();

const app = express();
const server = createServer(app);

// CORS 配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.io 配置
const io = new Server(server, {
  cors: corsOptions
});

// 将 io 实例传递给控制器
taskController.setSocketIO(io);

// 设置全局io实例供超时检测服务使用
setGlobalIo(io);

// 中间件配置
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 每个IP最多500个请求（开发环境）
  message: { error: '请求过于频繁，请稍后再试' },
  skip: (req, res) => {
    // 在开发环境中跳过一些健康检查请求
    return process.env.NODE_ENV === 'development' && req.path === '/health';
  }
});

app.use('/api/', limiter);

// 健康检查
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  const poolStatus = getPoolStatus();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected',
    connectionPool: {
      active: poolStatus.activeConnections,
      free: poolStatus.freeConnections,
      total: poolStatus.totalConnections,
      limit: poolStatus.connectionLimit,
      utilization: `${poolStatus.utilizationRate}%`
    }
  });
});

// API 路由
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/super-admin/stats', superAdminStatsRoutes);
app.use('/api/dispatcher/stats', dispatcherStatsRoutes);
app.use('/api/player/stats', playerStatsRoutes);
app.use('/api/game-dictionary', gameDictionaryRoutes);

// 静态文件服务 (可选，用于serve前端build后的文件)
app.use(express.static('../frontend/dist'));

// Socket.io 连接处理
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

// 404 处理
app.use('*', (req, res, next) => {
  next(new NotFoundError('API endpoint not found'));
});

// 统一错误处理中间件
app.use(errorHandler);

// === 启动调试信息 ===
console.log('--- Backend Startup Debug Info ---');
console.log(`NODE_ENV read from .env is: ${process.env.NODE_ENV}`);
console.log(`PORT read from .env is: ${process.env.PORT}`);
console.log(`DB_HOST read from .env is: ${process.env.DB_HOST}`);
console.log(`DB_DATABASE read from .env is: ${process.env.DB_DATABASE}`);
console.log(`ALLOWED_ORIGINS read from .env is: ${process.env.ALLOWED_ORIGINS}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log(`__dirname: ${import.meta.dirname || 'not available'}`);

const PORT = process.env.PORT || 5000;
console.log(`Final PORT value: ${PORT}`);

console.log('Attempting to start server...');

// 启动服务器
server.listen(PORT, async () => {
  console.log('=== Server.listen callback executed ===');
  console.log(`Server is listening on port ${PORT}`);
  logger.info('🚀 派单系统后端启动成功');
  logger.info(`📡 服务器地址: http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket端口: ${PORT}`);
  
  // 测试数据库连接和时区
  console.log('Testing database connection...');
  try {
    await testConnection();
    console.log('✅ Database connection test passed');
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Full error:', error);
  }
  
  console.log('Validating timezone...');
  try {
    await validateTimezone();
    console.log('✅ Timezone validation passed');
  } catch (error) {
    console.error('❌ Timezone validation failed:', error.message);
    console.error('Full error:', error);
  }
  
  // 显示连接池配置信息
  const poolStatus = getPoolStatus();
  logger.info('💾 数据库连接池配置:', {
    最大连接数: poolStatus.connectionLimit,
    当前总连接: poolStatus.totalConnections,
    空闲连接: poolStatus.freeConnections,
    活跃连接: poolStatus.activeConnections,
    使用率: `${poolStatus.utilizationRate}%`
  });
  
  // 启动超时检测服务
  overtimeService.start();
  logger.info('⏰ 超时检测服务已启动');
  
  // 启动会话清理服务
  sessionCleanupService.start();
  logger.info('🧹 会话清理服务已启动');
  
  logger.info('✅ 系统就绪，等待连接...');
  console.log('=== Server startup completed successfully ===');
}).on('error', (error) => {
  console.error('=== Server listen ERROR ===');
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('Full error object:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('Please check what is running on this port:');
    console.error(`   netstat -tlnp | grep :${PORT}`);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
    console.error('Try running with sudo or use a port > 1024');
  }
  
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到终止信号，正在关闭服务器...');
  overtimeService.stop();
  sessionCleanupService.stop();
  server.close(() => {
    logger.info('服务器已关闭');
  });
});

process.on('SIGINT', () => {
  logger.info('收到中断信号，正在关闭服务器...');
  overtimeService.stop();
  sessionCleanupService.stop();
  server.close(() => {
    logger.info('服务器已关闭');
  });
});