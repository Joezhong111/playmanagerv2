import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { testConnection, validateTimezone } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/AppError.js';

// 路由导入
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import setupRoutes from './routes/setup.js';
import statsRoutes from './routes/stats.js';
import { taskController } from './controllers/task.controller.js';

// Socket处理导入
import { handleSocketConnection } from './sockets/taskSocket.js';

// 超时检测服务导入
import { overtimeService, setGlobalIo } from './services/overtime.service.js';

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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected'
  });
});

// API 路由
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);

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

const PORT = process.env.PORT || 3000;

// 启动服务器
server.listen(PORT, async () => {
  logger.info('🚀 派单系统后端启动成功');
  logger.info(`📡 服务器地址: http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket端口: ${PORT}`);
  
  // 测试数据库连接和时区
  await testConnection();
  await validateTimezone();
  
  // 启动超时检测服务
  overtimeService.start();
  logger.info('⏰ 超时检测服务已启动');
  
  logger.info('✅ 系统就绪，等待连接...');
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到终止信号，正在关闭服务器...');
  overtimeService.stop();
  server.close(() => {
    logger.info('服务器已关闭');
  });
});

process.on('SIGINT', () => {
  logger.info('收到中断信号，正在关闭服务器...');
  overtimeService.stop();
  server.close(() => {
    logger.info('服务器已关闭');
  });
});