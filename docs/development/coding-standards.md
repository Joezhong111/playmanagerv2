# 编码规范

## 📋 概述

本文档定义了陪玩管理系统项目的编码规范和最佳实践，确保代码质量和一致性。所有开发人员都应该遵循这些规范。

## 🎯 通用原则

### 1. 代码可读性优先
- 代码应该像散文一样易于阅读
- 使用有意义的变量名和函数名
- 避免过度复杂的逻辑

### 2. 保持简单 (KISS)
- 不要过度设计
- 选择最简单的解决方案
- 避免不必要的复杂性

### 3. DRY原则 (Don't Repeat Yourself)
- 提取重复代码到函数或组件
- 使用配置和常量
- 避免复制粘贴代码

### 4. 单一职责
- 每个函数/组件只负责一个功能
- 保持函数简短和专注
- 合理拆分大型组件

## 📝 TypeScript 规范

### 基础类型

#### 类型定义
```typescript
// 使用interface定义对象类型
interface User {
  id: number;
  username: string;
  role: 'dispatcher' | 'player';
  status: 'idle' | 'busy' | 'offline';
}

// 使用type定义联合类型或别名
type TaskStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
type UserRole = 'dispatcher' | 'player';

// 使用enum定义常量枚举
enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}
```

#### 函数类型
```typescript
// 定义函数参数和返回类型
interface TaskService {
  createTask(task: CreateTaskDto): Promise<Task>;
  updateTask(id: number, task: UpdateTaskDto): Promise<Task>;
  deleteTask(id: number): Promise<void>;
}

// 使用类型别名定义函数类型
type TaskEventHandler = (task: Task) => void;
type AsyncTaskHandler = (taskId: number) => Promise<void>;
```

#### 泛型使用
```typescript
// 定义泛型接口
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

// 定义泛型函数
async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json();
}

// 使用泛型约束
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 最佳实践

#### 避免使用any
```typescript
// ❌ 错误：使用any
const data: any = await fetch('/api/tasks');

// ✅ 正确：定义具体类型
interface Task {
  id: number;
  title: string;
  status: TaskStatus;
}
const data: Task[] = await fetch('/api/tasks');
```

#### 使用可选属性
```typescript
// ❌ 错误：使用undefined检查
interface User {
  email: string;
  phone: string;
}

// ✅ 正确：使用可选属性
interface User {
  email?: string;
  phone?: string;
}
```

#### 使用readonly和常量
```typescript
// ✅ 使用readonly确保不可变性
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// ✅ 使用const和as const
const STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

type Status = typeof STATUSES[keyof typeof STATUSES];
```

## ⚛️ React 规范

### 组件设计

#### 函数组件优先
```tsx
// ✅ 使用函数组件和Hooks
import React, { useState, useEffect } from 'react';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(task.id, 'accepted');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <button 
        onClick={handleAccept}
        disabled={isLoading}
      >
        {isLoading ? '处理中...' : '接受任务'}
      </button>
    </div>
  );
};

export default TaskCard;
```

#### Props类型定义
```tsx
// ✅ 明确定义Props接口
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

// 使用默认值
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### Hooks 使用规范

#### useState
```tsx
// ✅ 使用具名状态
const [tasks, setTasks] = useState<Task[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [selectedTask, setSelectedTask] = useState<Task | null>(null);

// ✅ 使用函数式更新避免依赖
const [count, setCount] = useState(0);
const increment = () => setCount(prev => prev + 1);
```

#### useEffect
```tsx
// ✅ 正确的依赖数组
useEffect(() => {
  const fetchTasks = async () => {
    const data = await taskApi.getTasks();
    setTasks(data);
  };
  
  fetchTasks();
}, []); // 空依赖数组表示只在组件挂载时执行

// ✅ 清理副作用
useEffect(() => {
  const timer = setInterval(() => {
    setTime(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);
```

#### 自定义Hooks
```tsx
// ✅ 使用use前缀命名自定义Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
```

### 条件渲染

#### 使用三元运算符
```tsx
// ✅ 简单条件使用三元运算符
{isLoading ? <LoadingSpinner /> : <Content />}
```

#### 使用逻辑与运算符
```tsx
// ✅ 多条件渲染
{user && <UserProfile user={user} />}
{tasks.length > 0 && <TaskList tasks={tasks} />}
```

#### 使用map渲染列表
```tsx
// ✅ 列表渲染必须包含key
{tasks.map(task => (
  <TaskItem 
    key={task.id} 
    task={task} 
    onUpdate={handleTaskUpdate} 
  />
))}
```

### 事件处理

#### 事件处理函数
```tsx
// ✅ 使用async/await处理异步事件
const handleTaskSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  
  try {
    setIsLoading(true);
    await taskApi.createTask(formData);
    // 成功处理
  } catch (error) {
    // 错误处理
    console.error('创建任务失败:', error);
  } finally {
    setIsLoading(false);
  }
};

// ✅ 使用useCallback避免不必要的重渲染
const handleStatusChange = useCallback((taskId: number, status: TaskStatus) => {
  onStatusChange(taskId, status);
}, [onStatusChange]);
```

## 🟦 后端规范

### 文件结构

#### 控制器-服务-仓储模式
```typescript
// controllers/task.controller.ts
import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/task.dto';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskDto = req.body;
      const task = await this.taskService.createTask(taskData);
      
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
```

#### 服务层
```typescript
// services/task.service.ts
import { TaskRepository } from '../repositories/task.repository';
import { UserRepository } from '../repositories/user.repository';
import { Task } from '../models/task.model';
import { CreateTaskInput } from '../dto/task.dto';

export class TaskService {
  private taskRepository: TaskRepository;
  private userRepository: UserRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.userRepository = new UserRepository();
  }

  async createTask(taskData: CreateTaskInput): Promise<Task> {
    // 验证派单员权限
    const dispatcher = await this.userRepository.findById(taskData.dispatcherId);
    if (!dispatcher || dispatcher.role !== 'dispatcher') {
      throw new Error('Unauthorized dispatcher');
    }

    // 如果指定了陪玩员，验证其状态
    if (taskData.playerId) {
      const player = await this.userRepository.findById(taskData.playerId);
      if (!player || player.status !== 'idle') {
        throw new Error('Player is not available');
      }
    }

    // 创建任务
    const task = await this.taskRepository.create({
      ...taskData,
      status: taskData.playerId ? 'accepted' : 'pending'
    });

    return task;
  }
}
```

#### 仓储层
```typescript
// repositories/task.repository.ts
import { pool } from '../config/database';
import { Task } from '../models/task.model';
import { BaseRepository } from './base.repository';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super('tasks');
  }

  async create(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const query = `
      INSERT INTO tasks (customer_name, customer_contact, game_name, game_mode, 
                      duration, price, requirements, dispatcher_id, player_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(query, [
      taskData.customer_name,
      taskData.customer_contact,
      taskData.game_name,
      taskData.game_mode,
      taskData.duration,
      taskData.price,
      taskData.requirements || '',
      taskData.dispatcher_id,
      taskData.player_id || null,
      taskData.status
    ]);

    return this.findById(result.insertId);
  }

  async findById(id: number): Promise<Task | null> {
    const query = `
      SELECT t.*, 
             u1.username as dispatcher_name,
             u2.username as player_name
      FROM tasks t
      LEFT JOIN users u1 ON t.dispatcher_id = u1.id
      LEFT JOIN users u2 ON t.player_id = u2.id
      WHERE t.id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }
}
```

### 错误处理

#### 自定义错误类
```typescript
// utils/AppError.ts
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误类型
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}
```

#### 全局错误处理中间件
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  }

  // 记录错误日志
  logger.error('Application error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  // 开发环境返回详细错误信息
  const response: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};
```

### 数据验证

#### DTO验证
```typescript
// dto/task.dto.ts
import { IsString, IsInt, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customer_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  customer_contact: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  game_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  game_mode: string;

  @IsInt()
  @Min(1)
  @Max(1440) // 24小时
  duration: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requirements?: string;

  @IsOptional()
  @IsInt()
  player_id?: number;
}
```

#### 验证中间件
```typescript
// middleware/validation.ts
import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }
  
  next();
};
```

### 日志规范

#### 结构化日志
```typescript
// utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'playmanager-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

#### 日志使用
```typescript
// 在控制器中使用日志
import logger from '../utils/logger';

export class TaskController {
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Creating new task', {
        dispatcherId: req.user.id,
        taskData: req.body
      });

      const task = await this.taskService.createTask(req.body);
      
      logger.info('Task created successfully', {
        taskId: task.id,
        dispatcherId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      logger.error('Failed to create task', {
        error: error.message,
        stack: error.stack,
        dispatcherId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
```

## 🗄️ 数据库规范

### 命名约定

#### 表名和字段名
```sql
-- 使用小写字母和下划线
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('dispatcher', 'player') NOT NULL,
    status ENUM('idle', 'busy', 'offline') DEFAULT 'idle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL,
    customer_contact VARCHAR(50) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    game_mode VARCHAR(100) NOT NULL,
    duration INT NOT NULL COMMENT 'Duration in minutes',
    price DECIMAL(10,2) NOT NULL,
    requirements TEXT,
    dispatcher_id INT NOT NULL,
    player_id INT,
    status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') 
           DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (dispatcher_id) REFERENCES users(id),
    FOREIGN KEY (player_id) REFERENCES users(id)
);
```

#### 索引命名
```sql
-- 单列索引：idx_表名_字段名
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 复合索引：idx_表名_字段1_字段2
CREATE INDEX idx_tasks_player_status ON tasks(player_id, status);
CREATE INDEX idx_tasks_dispatcher_created ON tasks(dispatcher_id, created_at);

-- 全文索引：ft_idx_表名_字段名
CREATE FULLTEXT INDEX ft_idx_tasks_search ON tasks(game_name, game_mode, requirements);
```

### 查询规范

#### 使用预处理语句
```typescript
// ✅ 使用参数化查询防止SQL注入
const getTasksByStatus = async (status: string): Promise<Task[]> => {
  const query = `
    SELECT t.*, u.username as dispatcher_name
    FROM tasks t
    LEFT JOIN users u ON t.dispatcher_id = u.id
    WHERE t.status = ?
    ORDER BY t.created_at DESC
  `;
  
  const [rows] = await pool.execute(query, [status]);
  return rows;
};
```

#### 事务处理
```typescript
// ✅ 使用事务确保数据一致性
const transferTask = async (taskId: number, newPlayerId: number): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. 验证任务存在
    const [tasks] = await connection.execute(
      'SELECT * FROM tasks WHERE id = ? FOR UPDATE',
      [taskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('Task not found');
    }
    
    // 2. 更新任务
    await connection.execute(
      'UPDATE tasks SET player_id = ?, status = ? WHERE id = ?',
      [newPlayerId, 'accepted', taskId]
    );
    
    // 3. 更新陪玩员状态
    await connection.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['busy', newPlayerId]
    );
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
```

## 🧪 测试规范

### 单元测试

#### React组件测试
```typescript
// components/__tests__/TaskCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCard } from '../TaskCard';

const mockTask = {
  id: 1,
  title: '英雄联盟排位赛',
  customer_name: '张三',
  status: 'pending' as const,
  duration: 60,
  price: 100
};

const mockOnStatusChange = jest.fn();

describe('TaskCard', () => {
  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  it('应该渲染任务信息', () => {
    render(
      <TaskCard 
        task={mockTask} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.getByText('英雄联盟排位赛')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('60分钟')).toBeInTheDocument();
    expect(screen.getByText('¥100')).toBeInTheDocument();
  });

  it('点击接受按钮应该调用onStatusChange', async () => {
    render(
      <TaskCard 
        task={mockTask} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    const acceptButton = screen.getByText('接受任务');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith(1, 'accepted');
    });
  });

  it('加载状态应该禁用按钮', () => {
    render(
      <TaskCard 
        task={mockTask} 
        onStatusChange={mockOnStatusChange}
        isLoading={true}
      />
    );

    const acceptButton = screen.getByText('处理中...');
    expect(acceptButton).toBeDisabled();
  });
});
```

#### API测试
```typescript
// api/__tests__/taskApi.test.ts
import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';

describe('Task API', () => {
  let authToken: string;
  let dispatcherId: number;

  beforeAll(async () => {
    // 创建测试用户并获取token
    const userResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'dispatcher',
        password: 'password'
      });
    
    authToken = userResponse.body.data.token;
    dispatcherId = userResponse.body.data.user.id;
  });

  describe('POST /api/tasks', () => {
    it('应该创建新任务', async () => {
      const taskData = {
        customer_name: '李四',
        customer_contact: '13800138000',
        game_name: 'Valorant',
        game_mode: '竞技模式',
        duration: 60,
        price: 100
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game_name).toBe('Valorant');
      expect(response.body.data.dispatcher_id).toBe(dispatcherId);
    });

    it('没有认证应该返回401', async () => {
      const taskData = {
        customer_name: '李四',
        customer_contact: '13800138000',
        game_name: 'Valorant',
        game_mode: '竞技模式',
        duration: 60,
        price: 100
      };

      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);
    });

    it('无效数据应该返回400', async () => {
      const invalidData = {
        customer_name: '', // 无效
        customer_contact: '13800138000',
        game_name: 'Valorant',
        game_mode: '竞技模式',
        duration: 60,
        price: 100
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/tasks', () => {
    it('应该返回任务列表', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('支持分页', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
```

### 集成测试

#### 数据库测试
```typescript
// repositories/__tests__/taskRepository.test.ts
import { TaskRepository } from '../taskRepository';
import { pool } from '../../config/database';

describe('TaskRepository', () => {
  let taskRepository: TaskRepository;
  let testTaskId: number;

  beforeAll(async () => {
    taskRepository = new TaskRepository();
  });

  afterAll(async () => {
    // 清理测试数据
    if (testTaskId) {
      await pool.execute('DELETE FROM tasks WHERE id = ?', [testTaskId]);
    }
  });

  describe('create', () => {
    it('应该创建新任务', async () => {
      const taskData = {
        customer_name: '测试客户',
        customer_contact: '13800138000',
        game_name: '测试游戏',
        game_mode: '测试模式',
        duration: 60,
        price: 100,
        dispatcher_id: 1,
        status: 'pending' as const
      };

      const task = await taskRepository.create(taskData);
      
      expect(task.id).toBeDefined();
      expect(task.customer_name).toBe('测试客户');
      expect(task.status).toBe('pending');
      
      testTaskId = task.id;
    });
  });

  describe('findById', () => {
    it('应该根据ID查找任务', async () => {
      const task = await taskRepository.findById(testTaskId);
      
      expect(task).toBeDefined();
      expect(task?.id).toBe(testTaskId);
    });

    it('不存在的ID应该返回null', async () => {
      const task = await taskRepository.findById(999999);
      
      expect(task).toBeNull();
    });
  });
});
```

## 📦 Git规范

### Commit消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type类型
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复bug）
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 示例
```
feat(auth): 添加JWT认证功能

- 实现用户登录和注册
- 添加JWT token生成和验证
- 集成认证中间件

Closes #123
```

### 分支命名

#### 功能分支
```
feature/功能名称
feature/user-authentication
feature/task-management
```

#### Bug修复分支
```
bugfix/问题描述
bugfix/login-validation-error
bugfix/task-timer-issue
```

#### 发布分支
```
release/v1.0.0
release/v1.1.0
```

## 🔍 代码审查清单

### 前端审查清单

- [ ] 组件遵循单一职责原则
- [ ] Props和State类型定义正确
- [ ] 使用了合适的React Hooks
- [ ] 事件处理函数正确绑定
- [ ] 条件渲染逻辑清晰
- [ ] 列表渲染包含唯一key
- [ ] 样式使用CSS模块或Styled Components
- [ ] 响应式设计考虑
- [ ] 错误边界处理
- [ ] 加载状态处理

### 后端审查清单

- [ ] 遵循Controller-Service-Repository架构
- [ ] 输入验证完整
- [ ] 错误处理完善
- [ ] 数据库查询使用参数化
- [ ] 事务处理正确
- [ ] 日志记录适当
- [ ] API响应格式一致
- [ ] 认证和授权正确实现
- [ ] 性能考虑（索引、缓存）
- [ ] 安全考虑（SQL注入、XSS）

### 测试审查清单

- [ ] 测试覆盖主要功能
- [ ] 测试用例命名清晰
- [ ] 断言准确
- [ ] Mock和Stub使用适当
- [ ] 集成测试覆盖关键流程
- [ ] 端到端测试覆盖用户场景

---

*本文档定义了项目的编码规范，所有开发人员都应该遵循这些规范以确保代码质量和一致性。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 开发团队