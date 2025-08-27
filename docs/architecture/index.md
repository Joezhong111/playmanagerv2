# 系统架构

## 🏗️ 架构概览

陪玩管理系统采用现代化的前后端分离架构，结合微服务设计理念，确保系统的可扩展性、可维护性和高性能。

### 架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                前端层 (Frontend)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   派单员界面     │  │   陪玩员界面     │  │   登录界面      │  │   专注模式      │ │
│  │  (React SPA)   │  │  (React SPA)   │  │ (React SPA)   │  │  (React SPA)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                    │                    │                    │       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    React 应用状态管理 (Zustand)                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │ │ 用户状态     │  │ 任务状态     │  │ UI状态      │  │ Socket状态  │ │ │
│  │ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                后端层 (Backend)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          API Gateway (Express)                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │ │ 路由管理     │  │ 中间件      │  │ 认证授权    │  │ 限流控制    │   │ │
│  │ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│           │                    │                    │                    │       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   用户服务      │  │   任务服务      │  │   统计服务      │  │   通知服务      │ │
│  │ (User Service)  │  │ (Task Service)  │  │ (Stats Service)│  │ (Notify Service)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Database Protocol
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               数据存储层 (Data)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────┐ │
│  │      MySQL 数据库       │  │      Redis 缓存        │  │   文件存储       │ │
│  │  • 用户表 (users)      │  │  • 会话缓存            │  │  • 日志文件       │ │
│  │  • 任务表 (tasks)      │  │  • 用户状态            │  │  • 备份文件       │ │
│  │  • 日志表 (logs)      │  │  • 任务数据            │  │  • 静态资源       │ │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 核心特性

#### 🚀 高性能
- **前端**: React 19 + TypeScript + Vite，支持HMR和Tree Shaking
- **后端**: Node.js + Express，异步非阻塞I/O
- **数据库**: MySQL连接池，Redis缓存优化
- **通信**: WebSocket实时双向通信

#### 🔒 安全可靠
- **认证**: JWT Token + Redis会话管理
- **授权**: 基于角色的访问控制(RBAC)
- **数据**: 参数化查询，防止SQL注入
- **传输**: HTTPS加密，CORS控制

#### 📡 实时通信
- **WebSocket**: Socket.io支持断线重连
- **事件驱动**: 发布-订阅模式
- **状态同步**: 实时数据一致性
- **消息队列**: 异步事件处理

#### 🛠️ 易于维护
- **模块化**: 清晰的代码结构和职责分离
- **类型安全**: TypeScript全栈类型支持
- **测试覆盖**: 单元测试和集成测试
- **文档完善**: API文档和架构文档

## 📋 技术栈选择

### 前端技术栈

| 技术 | 版本 | 用途 | 特性 |
|------|------|------|------|
| React | 19.1.1 | UI框架 | 组件化、虚拟DOM、Hook |
| TypeScript | 5.8 | 类型系统 | 静态类型检查、IDE支持 |
| Vite | 7.1 | 构建工具 | 快速构建、HMR、Tree Shaking |
| Ant Design | 5.27 | UI组件库 | 企业级组件、设计规范 |
| Zustand | 5.0 | 状态管理 | 轻量级、TypeScript支持 |
| React Router | 7.8 | 路由管理 | 声明式路由、嵌套路由 |
| Axios | 1.11 | HTTP客户端 | 请求拦截、错误处理 |
| Socket.io Client | 4.8 | WebSocket | 实时通信、断线重连 |

### 后端技术栈

| 技术 | 版本 | 用途 | 特性 |
|------|------|------|------|
| Node.js | 18+ | 运行时 | 异步非阻塞I/O |
| Express | 4.18 | Web框架 | 路由、中间件、MVC |
| TypeScript | 5.8 | 类型系统 | 静态类型检查 |
| Socket.io | 4.7 | WebSocket | 实时通信、房间管理 |
| MySQL2 | 3.6 | 数据库驱动 | 连接池、预处理语句 |
| Redis | 7.0 | 缓存 | 内存存储、数据结构 |
| JWT | 9.0 | 认证 | 无状态Token |
| Bcrypt | 5.1 | 密码加密 | 哈希加密、安全存储 |
| Winston | 3.10 | 日志 | 结构化日志、多传输 |

### 基础设施

| 技术 | 用途 | 特性 |
|------|------|------|
| Docker | 容器化 | 环境一致性、快速部署 |
| Nginx | 反向代理 | 负载均衡、静态资源 |
| PM2 | 进程管理 | 进程守护、日志管理 |
| Git | 版本控制 | 代码管理、协作开发 |
| ESLint | 代码检查 | 代码规范、错误检查 |
| Jest | 测试框架 | 单元测试、快照测试 |

## 🎯 架构原则

### 1. 分层架构 (Layered Architecture)
```
┌─────────────────────────────────────────┐
│             表现层 (Presentation)        │
│  React Components + TypeScript         │
├─────────────────────────────────────────┤
│             应用层 (Application)          │
│  Business Logic + Service Layer        │
├─────────────────────────────────────────┤
│             数据层 (Data)                │
│  Repository Pattern + Data Access      │
├─────────────────────────────────────────┤
│           基础设施层 (Infrastructure)   │
│  Database + Cache + Message Queue     │
└─────────────────────────────────────────┘
```

**优点**:
- 职责分离清晰
- 易于测试和维护
- 支持水平扩展

### 2. 领域驱动设计 (DDD)
```
┌─────────────────────────────────────────┐
│               领域层 (Domain)            │
│  Entities (用户、任务)                 │
│  Value Objects (时长、价格)             │
│  Aggregates (任务聚合)                 │
│  Repositories (数据访问)               │
└─────────────────────────────────────────┘
```

**核心领域模型**:
- **用户聚合**: 用户信息、状态、权限
- **任务聚合**: 任务信息、状态流转、计时
- **统计聚合**: 数据统计、分析报表

### 3. CQRS模式 (Command Query Responsibility Segregation)
```
┌─────────────────────────────────────────┐
│              命令端 (Command)           │
│  Create/Update/Delete Operations     │
├─────────────────────────────────────────┤
│              查询端 (Query)             │
│  Read Operations + Materialized View  │
└─────────────────────────────────────────┘
```

**应用场景**:
- 任务创建/更新/删除 (命令)
- 任务查询/统计 (查询)
- 用户状态变更 (命令)
- 用户信息查询 (查询)

### 4. 事件驱动架构 (Event Driven)
```
┌─────────────────┐    Event    ┌─────────────────┐
│   Command       │ ────────────>│    Event        │
│   Service       │              │    Handler      │
└─────────────────┘              └─────────────────┘
         ▲                             │
         │                             ▼
┌─────────────────┐    Event    ┌─────────────────┐
│   Read Model    │ <───────────│   Write Model   │
│   (Projections) │              │   (Aggregate)   │
└─────────────────┘              └─────────────────┘
```

**事件类型**:
- 领域事件: TaskCreated, TaskCompleted
- 集成事件: UserOnline, UserOffline
- 系统事件: TimerExpired, StatusChanged

## 🔧 系统组件

### 前端组件架构

#### 页面组件 (Pages)
```
src/pages/
├── Login.tsx          # 登录页面
├── Dispatcher.tsx     # 派单员主页面
├── Player.tsx         # 陪玩员主页面
└── TaskFocus.tsx      # 任务专注模式
```

#### 业务组件 (Components)
```
src/components/
├── TaskCard.tsx       # 任务卡片
├── TimerDisplay.tsx    # 倒计时显示
├── StatusIndicator.tsx # 状态指示器
└── Notification.tsx    # 通知组件
```

#### 状态管理 (Store)
```
src/store.ts
├── user: User | null
├── tasks: Task[]
├── currentTask: Task | null
├── loading: boolean
└── connected: boolean
```

#### 自定义Hooks (Hooks)
```
src/hooks/
├── useAuth.ts         # 认证状态管理
├── useTasks.ts        # 任务数据管理
├── usePlayers.ts      # 陪玩员数据管理
└── useSocket.ts       # WebSocket连接管理
```

### 后端服务架构

#### 路由层 (Routes)
```
routes/
├── auth.js           # 认证相关路由
├── users.js          # 用户管理路由
├── tasks.js          # 任务管理路由
└── stats.js          # 统计相关路由
```

#### 服务层 (Services)
```
services/
├── AuthService.js    # 认证服务
├── TaskService.js    # 任务服务
├── UserService.js    # 用户服务
└── StatsService.js   # 统计服务
```

#### 中间件 (Middleware)
```
middleware/
├── auth.js           # 认证中间件
├── validation.js     # 数据验证
├── rateLimiter.js    # 限流控制
└── errorHandler.js   # 错误处理
```

#### Socket事件处理
```
sockets/
├── taskSocket.js     # 任务相关事件
├── userSocket.js     # 用户相关事件
└── statsSocket.js    # 统计相关事件
```

### 数据库设计

#### 核心表结构
```sql
-- 用户表
users (id, username, password, role, status, created_at)

-- 任务表
tasks (id, customer_name, customer_contact, game_name, game_mode, 
       duration, price, requirements, dispatcher_id, player_id, 
       status, created_at, accepted_at, started_at, completed_at)

-- 任务日志表
task_logs (id, task_id, user_id, action, details, created_at)

-- 用户会话表
user_sessions (id, user_id, token, expires_at, created_at)
```

#### 索引设计
```sql
-- 用户索引
CREATE INDEX idx_users_role_status ON users(role, status);

-- 任务索引
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at);
CREATE INDEX idx_tasks_player_id ON tasks(player_id);

-- 日志索引
CREATE INDEX idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX idx_task_logs_created ON task_logs(created_at);
```

## 🚀 部署架构

### 开发环境
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Vite Dev)    │◄──►│  (Node Dev)     │◄──►│   (MySQL)       │
│   :5173         │    │   :3000         │    │   :3306         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 生产环境
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Node Cluster  │    │   MySQL Master  │
│   (Load Balancer)│◄──►│   (PM2)         │◄──►│   (Replication) │
│   :80/443       │    │   :3000         │    │   :3306         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   Redis Cache   │    │   MySQL Slave   │
│   (CDN)         │    │   (Cluster)      │    │   (Read-only)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 容器化部署
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend-react
    ports:
      - "80:80"
    depends_on:
      - backend
  
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
  
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: playmanager
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 📊 性能优化

### 前端优化
- **代码分割**: 路由级别懒加载
- **缓存策略**: Service Worker + API缓存
- **图片优化**: WebP格式、懒加载
- **打包优化**: Tree Shaking、代码压缩

### 后端优化
- **数据库优化**: 连接池、索引优化、查询优化
- **缓存策略**: Redis多级缓存、查询结果缓存
- **API优化**: 响应压缩、CDN加速
- **并发处理**: 异步队列、限流控制

### 网络优化
- **WebSocket**: 连接复用、消息压缩
- **HTTP/2**: 多路复用、头部压缩
- **CDN**: 静态资源加速、边缘缓存

---

*本文档描述了陪玩管理系统的完整架构设计，为开发团队提供技术指导和最佳实践。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 架构团队