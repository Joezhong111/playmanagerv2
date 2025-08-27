# 系统架构设计

## 🏗️ 总体架构

陪玩管理系统采用现代化的前后端分离架构，结合微服务设计理念，确保系统的可扩展性、可维护性和高性能。

### 架构分层

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            表现层 (Presentation)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Login Page  │  │Dispatcher  │  │ Player Page │  │Task Focus  │  │Error Pages  │ │
│  │             │  │   Dashboard │  │  Dashboard  │  │   Mode      │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             应用层 (Application)                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        API Gateway (Express)                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │ │   Router    │  │ Middleware  │  │  Auth       │  │ Rate Limit  │ │ │
│  │ │   Handler   │  │   Chain     │  │   Service    │  │   Control   │ │ │
│  │ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│           │                    │                    │                    │       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   User Service  │  │   Task Service  │  │   Stats Service│  │  Notify Service│ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │ • Authentication│  │ • Task CRUD     │  │ • Analytics    │  │ • WebSocket    │ │
│  │ • Authorization │  │ • Assignment   │  │ • Reports      │  │ • Email/SMS    │ │
│  │ • User Profile  │  │ • Timer Mgmt   │  │ • Metrics      │  │ • Push Notify  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Protocol
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            数据层 (Data Layer)                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │         MySQL Database            │  │          Redis Cache            │   │
│  ┌─────────────┐  ┌─────────────┐  │  ┌─────────────┐  ┌─────────────┐   │
│  │   users      │  │   tasks      │  │ │  sessions    │  │   user_data │   │
│  │   user_logs  │  │   task_logs  │  │ │  task_cache  │  │   stats     │   │
│  │   sessions   │  │   statistics │  │ │  rate_limits │  │   online_users│   │
│  └─────────────┘  └─────────────┘  │  └─────────────┘  └─────────────┘   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 设计原则

### 1. 单一职责原则 (SRP)
每个组件和服务都有明确的单一职责：
- **User Service**: 只负责用户相关业务逻辑
- **Task Service**: 只负责任务相关业务逻辑  
- **Stats Service**: 只负责统计相关业务逻辑
- **Notify Service**: 只负责通知相关业务逻辑

### 2. 开放封闭原则 (OCP)
系统对扩展开放，对修改封闭：
- 通过接口和抽象类定义契约
- 使用依赖注入实现松耦合
- 支持插件化扩展新功能

### 3. 依赖倒置原则 (DIP)
高层模块不依赖低层模块，都依赖抽象：
- Service层依赖Repository接口
- Controller层依赖Service接口
- 具体实现通过依赖注入提供

### 4. 接口隔离原则 (ISP)
使用多个专门的接口，而不是单一的总接口：
- `IUserService` - 用户服务接口
- `ITaskService` - 任务服务接口
- `IStatsService` - 统计服务接口
- `INotifyService` - 通知服务接口

## 🔧 技术架构

### 前端架构

#### 组件架构
```
src/
├── components/           # 可复用组件
│   ├── common/          # 通用组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   ├── business/        # 业务组件
│   │   ├── TaskCard.tsx
│   │   ├── TimerDisplay.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── UserAvatar.tsx
│   └── layout/          # 布局组件
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── pages/               # 页面组件
│   ├── Login.tsx
│   ├── Dashboard/
│   │   ├── Dispatcher.tsx
│   │   └── Player.tsx
│   └── Task/
│       └── Focus.tsx
├── hooks/              # 自定义Hooks
│   ├── useAuth.ts
│   ├── useTasks.ts
│   ├── usePlayers.ts
│   └── useSocket.ts
├── store/              # 状态管理
│   ├── slices/          # 状态切片
│   ├── index.ts         # Store配置
│   └── middleware.ts   # 中间件
├── services/           # API服务
│   ├── api.ts
│   ├── socket.ts
│   └── auth.ts
├── utils/              # 工具函数
│   ├── date.ts
│   ├── validation.ts
│   └── constants.ts
└── types/              # 类型定义
    ├── user.ts
    ├── task.ts
    └── api.ts
```

#### 状态管理 (Zustand)
```typescript
// store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // 用户状态
  user: User | null;
  isAuthenticated: boolean;
  
  // 任务状态
  tasks: Task[];
  currentTask: Task | null;
  
  // UI状态
  loading: boolean;
  connected: boolean;
  
  // 操作方法
  setUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // 状态定义
        user: null,
        isAuthenticated: false,
        tasks: [],
        currentTask: null,
        loading: false,
        connected: false,
        
        // 操作方法
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setTasks: (tasks) => set({ tasks }),
        // ... 其他方法
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
);
```

#### 路由配置 (React Router v7)
```typescript
// router/AppRouter.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'dispatcher',
        element: <DispatcherDashboard />,
        children: [
          { index: true, element: <TaskList /> },
          { path: 'tasks', element: <TaskManagement /> },
          { path: 'players', element: <PlayerManagement /> },
          { path: 'stats', element: <Statistics /> },
        ],
      },
      {
        path: 'player',
        element: <PlayerDashboard />,
        children: [
          { index: true, element: <MyTasks /> },
          { path: 'task/:id', element: <TaskDetail /> },
          { path: 'focus/:id', element: <TaskFocus /> },
          { path: 'stats', element: <MyStats /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
```

### 后端架构

#### 服务分层架构
```
backend/
├── src/
│   ├── controllers/      # 控制器层
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── task.controller.ts
│   │   └── stats.controller.ts
│   ├── services/         # 服务层
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── task.service.ts
│   │   └── stats.service.ts
│   ├── repositories/     # 数据访问层
│   │   ├── user.repository.ts
│   │   ├── task.repository.ts
│   │   └── stats.repository.ts
│   ├── models/          # 数据模型
│   │   ├── user.model.ts
│   │   ├── task.model.ts
│   │   └── base.model.ts
│   ├── dto/             # 数据传输对象
│   │   ├── auth.dto.ts
│   │   ├── user.dto.ts
│   │   └── task.dto.ts
│   ├── middleware/      # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── sockets/         # Socket处理器
│   │   ├── task.socket.ts
│   │   ├── user.socket.ts
│   │   └── stats.socket.ts
│   ├── utils/           # 工具函数
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── crypto.ts
│   │   └── response.ts
│   └── config/          # 配置
│       ├── database.ts
│       ├── redis.ts
│       └── app.ts
```

#### 控制器模式
```typescript
// controllers/task.controller.ts
import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import { validateRequest } from '../middleware/validation.middleware';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  @validateRequest(CreateTaskDto)
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskDto = req.body;
      const dispatcherId = req.user.id;
      
      const result = await this.taskService.createTask({
        ...taskData,
        dispatcherId,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Task created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, playerId } = req.query;
      const filters = { status, playerId };
      
      const result = await this.taskService.getTasks({
        page: Number(page),
        limit: Number(limit),
        filters,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
```

#### 服务层模式
```typescript
// services/task.service.ts
import { TaskRepository } from '../repositories/task.repository';
import { UserRepository } from '../repositories/user.repository';
import { EventEmitter } from 'events';
import { Task } from '../models/task.model';

export class TaskService extends EventEmitter {
  private taskRepository: TaskRepository;
  private userRepository: UserRepository;

  constructor() {
    super();
    this.taskRepository = new TaskRepository();
    this.userRepository = new UserRepository();
  }

  async createTask(taskData: CreateTaskInput): Promise<Task> {
    // 验证用户权限
    const dispatcher = await this.userRepository.findById(taskData.dispatcherId);
    if (!dispatcher || dispatcher.role !== 'dispatcher') {
      throw new Error('Unauthorized dispatcher');
    }

    // 如果指定了陪玩员，验证其状态
    if (taskData.playerId) {
      const player = await this.userRepository.findById(taskData.playerId);
      if (!player || player.role !== 'player') {
        throw new Error('Invalid player');
      }
      if (player.status !== 'idle') {
        throw new Error('Player is not available');
      }
    }

    // 创建任务
    const task = await this.taskRepository.create({
      ...taskData,
      status: taskData.playerId ? 'accepted' : 'pending',
    });

    // 如果指定了陪玩员，更新其状态
    if (taskData.playerId) {
      await this.userRepository.updateStatus(taskData.playerId, 'busy');
    }

    // 发送事件通知
    this.emit('taskCreated', task);

    return task;
  }

  async assignTask(taskId: number, playerId: number): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'pending') {
      throw new Error('Task cannot be assigned');
    }

    const player = await this.userRepository.findById(playerId);
    if (!player || player.status !== 'idle') {
      throw new Error('Player is not available');
    }

    // 更新任务
    const updatedTask = await this.taskRepository.update(taskId, {
      playerId,
      status: 'accepted',
      acceptedAt: new Date(),
    });

    // 更新陪玩员状态
    await this.userRepository.updateStatus(playerId, 'busy');

    // 发送事件通知
    this.emit('taskAssigned', updatedTask);

    return updatedTask;
  }
}
```

#### Repository模式
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
      taskData.status,
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

  async findWithFilters(filters: TaskFilters): Promise<{ tasks: Task[], total: number }> {
    let query = `
      SELECT t.*, 
             u1.username as dispatcher_name,
             u2.username as player_name
      FROM tasks t
      LEFT JOIN users u1 ON t.dispatcher_id = u1.id
      LEFT JOIN users u2 ON t.player_id = u2.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
    
    if (filters.playerId) {
      query += ' AND t.player_id = ?';
      params.push(filters.playerId);
    }
    
    if (filters.dispatcherId) {
      query += ' AND t.dispatcher_id = ?';
      params.push(filters.dispatcherId);
    }
    
    // 获取总数
    const countQuery = query.replace('SELECT t.*, u1.username as dispatcher_name, u2.username as player_name', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;
    
    // 添加排序和分页
    query += ' ORDER BY t.created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(filters.limit, filters.offset);
    
    const [rows] = await pool.execute(query, params);
    
    return {
      tasks: rows,
      total,
    };
  }
}
```

## 🌐 数据库架构

### ER图设计
```
┌─────────────────┐    1:N    ┌─────────────────┐
│     users       │◄─────────│      tasks       │
├─────────────────┤           ├─────────────────┤
│ id (PK)        │           │ id (PK)         │
│ username       │           │ customer_name   │
│ password       │           │ customer_contact│
│ role           │           │ game_name       │
│ status         │           │ game_mode       │
│ created_at     │           │ duration        │
│ updated_at     │           │ price           │
└─────────────────┘           │ requirements   │
                             │ dispatcher_id  │ (FK)
                             │ player_id       │ (FK)
                             │ status          │
                             │ created_at      │
                             │ accepted_at     │
                             │ started_at      │
                             │ completed_at    │
                             └─────────────────┘
                                   │
                                   │ 1:N
                                   ▼
                          ┌─────────────────┐
                          │    task_logs     │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ task_id (FK)    │
                          │ user_id (FK)    │
                          │ action          │
                          │ details         │
                          │ created_at      │
                          └─────────────────┘
```

### 表结构设计

#### 用户表 (users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
    role ENUM('dispatcher', 'player') NOT NULL COMMENT '用户角色',
    status ENUM('idle', 'busy', 'offline') DEFAULT 'idle' COMMENT '用户状态',
    email VARCHAR(100) UNIQUE COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    avatar VARCHAR(255) COMMENT '头像URL',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_role_status (role, status),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

#### 任务表 (tasks)
```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL COMMENT '客户姓名',
    customer_contact VARCHAR(50) NOT NULL COMMENT '客户联系方式',
    game_name VARCHAR(100) NOT NULL COMMENT '游戏名称',
    game_mode VARCHAR(100) NOT NULL COMMENT '游戏模式',
    duration INT NOT NULL COMMENT '任务时长(分钟)',
    price DECIMAL(10,2) NOT NULL COMMENT '任务价格',
    requirements TEXT COMMENT '特殊要求',
    dispatcher_id INT NOT NULL COMMENT '派单员ID',
    player_id INT NULL COMMENT '陪玩员ID',
    status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') 
           DEFAULT 'pending' COMMENT '任务状态',
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal' COMMENT '优先级',
    estimated_start_time TIMESTAMP NULL COMMENT '预计开始时间',
    actual_start_time TIMESTAMP NULL COMMENT '实际开始时间',
    actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',
    completion_note TEXT COMMENT '完成备注',
    rating INT NULL COMMENT '评分(1-5)',
    review TEXT COMMENT '评价内容',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (dispatcher_id) REFERENCES users(id),
    FOREIGN KEY (player_id) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_player_id (player_id),
    INDEX idx_dispatcher_id (dispatcher_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';
```

#### 任务日志表 (task_logs)
```sql
CREATE TABLE task_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL COMMENT '任务ID',
    user_id INT NOT NULL COMMENT '操作用户ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    old_values JSON NULL COMMENT '旧值(JSON)',
    new_values JSON NULL COMMENT '新值(JSON)',
    note TEXT COMMENT '备注',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务日志表';
```

#### 用户会话表 (user_sessions)
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    session_token VARCHAR(255) UNIQUE NOT NULL COMMENT '会话令牌',
    refresh_token VARCHAR(255) NOT NULL COMMENT '刷新令牌',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE COMMENT '是否已撤销',
    device_info JSON COMMENT '设备信息',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会话表';
```

#### 统计数据表 (statistics)
```sql
CREATE TABLE daily_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL COMMENT '统计日期',
    user_id INT NULL COMMENT '用户ID(为空则表示全局统计)',
    role ENUM('dispatcher', 'player') NULL COMMENT '用户角色',
    
    -- 任务统计
    total_tasks INT DEFAULT 0 COMMENT '总任务数',
    completed_tasks INT DEFAULT 0 COMMENT '已完成任务数',
    cancelled_tasks INT DEFAULT 0 COMMENT '已取消任务数',
    
    -- 时间统计
    total_duration INT DEFAULT 0 COMMENT '总时长(分钟)',
    average_duration DECIMAL(5,2) DEFAULT 0 COMMENT '平均时长(分钟)',
    
    -- 收入统计
    total_revenue DECIMAL(12,2) DEFAULT 0 COMMENT '总收入',
    average_price DECIMAL(10,2) DEFAULT 0 COMMENT '平均价格',
    
    -- 性能统计
    completion_rate DECIMAL(5,2) DEFAULT 0 COMMENT '完成率(%)',
    rating_avg DECIMAL(3,2) NULL COMMENT '平均评分',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_date_user_role (date, user_id, role),
    INDEX idx_date (date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日统计表';
```

### 数据库优化策略

#### 索引优化
```sql
-- 复合索引优化查询性能
CREATE INDEX idx_tasks_player_status_created 
ON tasks(player_id, status, created_at);

CREATE INDEX idx_tasks_dispatcher_status 
ON tasks(dispatcher_id, status);

CREATE INDEX idx_task_logs_task_created 
ON task_logs(task_id, created_at);

-- 全文索引支持搜索
CREATE FULLTEXT INDEX idx_tasks_game_search 
ON tasks(game_name, game_mode, requirements);
```

#### 分区策略
```sql
-- 按月分区任务日志表
ALTER TABLE task_logs 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    PARTITION p202503 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

#### 读写分离
```sql
-- 主库配置 (写操作)
CREATE DATABASE playmanager_master;

-- 从库配置 (读操作)
CREATE DATABASE playmanager_slave;

-- 复制用户设置
CREATE USER 'replicator'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
```

## 🔐 安全架构

### 认证授权流程
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   用户登录   │───►│  验证用户名  │───►│  生成JWT    │
└─────────────┘    │   密码      │    │   Token      │
                   └─────────────┘    └─────────────┘
                              │
                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Token存储  │◄───│  会话管理    │◄───│  权限检查    │
│   (HttpOnly) │    │   (Redis)    │    │   (RBAC)     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 安全措施

#### 1. 输入验证
```typescript
// DTO验证
import { IsString, IsEmail, IsEnum, IsOptional, Min, Max } from 'class-validator';

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

  @IsEnum(['league-of-legends', 'valorant', 'pubg', 'other'])
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
}
```

#### 2. SQL注入防护
```typescript
// 使用参数化查询
const query = `
  SELECT * FROM tasks 
  WHERE dispatcher_id = ? AND status = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`;

const [rows] = await pool.execute(query, [dispatcherId, status, limit, offset]);
```

#### 3. XSS防护
```typescript
// 输出转义
import xss from 'xss';

function sanitizeOutput(data: any): any {
  if (typeof data === 'string') {
    return xss(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  }
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeOutput(value);
    }
    return result;
  }
  return data;
}
```

#### 4. CSRF防护
```typescript
// CSRF Token
import { csrf } from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

app.use(csrfProtection);
```

## 🚀 性能优化

### 前端性能优化

#### 1. 代码分割
```typescript
// 路由级别代码分割
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TaskManagement = React.lazy(() => import('./pages/TaskManagement'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskManagement />} />
      </Routes>
    </Suspense>
  );
}
```

#### 2. 缓存策略
```typescript
// API缓存
const apiCache = new Map();

async function cachedFetch(url: string, options?: RequestInit) {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  // 缓存5分钟
  apiCache.set(cacheKey, data);
  setTimeout(() => apiCache.delete(cacheKey), 5 * 60 * 1000);
  
  return data;
}
```

#### 3. 虚拟滚动
```typescript
// 大列表虚拟滚动
const VirtualizedList = ({ items, renderItem, itemHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(window.innerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div 
      style={{ height: items.length * itemHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: startIndex * itemHeight }} />
      {visibleItems.map((item, index) => (
        <div key={item.id} style={{ height: itemHeight }}>
          {renderItem(item)}
        </div>
      ))}
      <div style={{ height: (items.length - endIndex) * itemHeight }} />
    </div>
  );
};
```

### 后端性能优化

#### 1. 数据库优化
```typescript
// 连接池配置
const pool = mysql.createPool({
  connectionLimit: 20,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false,
});

// 查询优化
async function getTasksWithPagination(filters: TaskFilters) {
  const { page = 1, limit = 20, ...where } = filters;
  const offset = (page - 1) * limit;
  
  // 使用预处理语句防止SQL注入
  const query = `
    SELECT t.*, u.username as dispatcher_name
    FROM tasks t
    LEFT JOIN users u ON t.dispatcher_id = u.id
    WHERE ${Object.entries(where).map(([key, value]) => 
      `${key} = ?`
    ).join(' AND ')}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const params = [...Object.values(where), limit, offset];
  const [rows] = await pool.execute(query, params);
  
  return rows;
}
```

#### 2. Redis缓存
```typescript
// Redis缓存服务
import { createClient } from 'redis';

const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  }
  
  async del(key: string): Promise<void> {
    await redisClient.del(key);
  }
  
  // 缓存击穿保护
  async getWithFallback<T>(
    key: string, 
    fallback: () => Promise<T>, 
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fallback();
    await this.set(key, data, ttl);
    return data;
  }
}
```

#### 3. API响应优化
```typescript
// 响应压缩
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// 分页响应
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### WebSocket优化

#### 1. 连接管理
```typescript
// Socket.io连接优化
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 连接限流
const connectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个连接
  message: 'Too many connection attempts',
});

io.use(connectionLimiter);
```

#### 2. 房间管理
```typescript
// 房间管理优化
class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();
  
  joinRoom(socketId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socketId);
  }
  
  leaveRoom(socketId: string, room: string): void {
    const roomSockets = this.rooms.get(room);
    if (roomSockets) {
      roomSockets.delete(socketId);
      if (roomSockets.size === 0) {
        this.rooms.delete(room);
      }
    }
  }
  
  broadcastToRoom(room: string, event: string, data: any): void {
    const roomSockets = this.rooms.get(room);
    if (roomSockets) {
      roomSockets.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit(event, data);
        }
      });
    }
  }
}
```

---

*本文档详细描述了陪玩管理系统的完整技术架构，为开发和部署提供指导。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 架构团队