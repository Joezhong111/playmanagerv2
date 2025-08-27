# 功能需求规格

## 📋 功能模块总览

陪玩管理系统包含以下核心功能模块：

1. **用户管理系统** - 用户认证、角色管理、状态控制
2. **任务管理系统** - 任务创建、分配、状态流转
3. **计时管理系统** - 倒计时、暂停恢复、自动完成
4. **实时通信系统** - WebSocket通信、状态通知
5. **数据统计系统** - 统计分析、报表生成

## 👤 用户管理模块

### 1.1 用户认证

#### 1.1.1 用户登录
**功能描述**: 提供安全的用户登录功能，支持角色权限分离

**业务规则**:
- 使用用户名和密码进行身份验证
- 支持派单员和陪玩员两种角色
- 登录成功后生成JWT token
- 记住登录状态功能（可选）

**输入参数**:
```typescript
interface LoginCredentials {
  username: string;    // 用户名，必填，长度3-50字符
  password: string;    // 密码，必填，长度6-100字符
  remember?: boolean;  // 记住登录，可选
}
```

**输出结果**:
```typescript
interface LoginResponse {
  success: boolean;
  data: {
    token: string;       // JWT token
    user: {
      id: number;
      username: string;
      role: 'dispatcher' | 'player';
      status: 'idle' | 'busy';
    }
  };
  message: string;
}
```

**异常处理**:
- 用户名不存在 (404)
- 密码错误 (401)
- 账号被禁用 (403)
- 系统错误 (500)

#### 1.1.2 用户登出
**功能描述**: 安全地终止用户会话，清理相关数据

**业务规则**:
- 清除本地存储的认证信息
- 断开WebSocket连接
- 更新用户在线状态
- 跳转到登录页面

**输入参数**: 无

**输出结果**:
```typescript
interface LogoutResponse {
  success: boolean;
  message: string;
}
```

### 1.2 用户状态管理

#### 1.2.1 状态切换
**功能描述**: 允许陪玩员切换自己的工作状态

**业务规则**:
- 支持三种状态：空闲(idle)、忙碌(busy)、离线(offline)
- 状态变更实时同步给派单员
- 忙碌状态下不接受新任务分配
- 离线状态下不显示在线状态

**输入参数**:
```typescript
interface StatusUpdate {
  status: 'idle' | 'busy' | 'offline';
  reason?: string;  // 状态变更原因，可选
}
```

**输出结果**:
```typescript
interface StatusResponse {
  success: boolean;
  data: {
    userId: number;
    newStatus: string;
    previousStatus: string;
    changedAt: string;
  };
  message: string;
}
```

## 📝 任务管理模块

### 2.1 任务创建

#### 2.1.1 创建新任务
**功能描述**: 派单员创建新的陪玩任务

**业务规则**:
- 任务创建后状态为pending（待接受）
- 可以指定陪玩员或开放接单
- 指定陪玩员后任务状态自动变为accepted
- 必填字段：客户姓名、联系方式、游戏名称、时长、价格

**输入参数**:
```typescript
interface CreateTaskRequest {
  customer_name: string;      // 客户姓名，必填，1-100字符
  customer_contact: string;   // 联系方式，必填，1-50字符
  game_name: string;          // 游戏名称，必填，1-100字符
  game_mode: string;          // 游戏模式，必填，1-100字符
  duration: number;          // 任务时长(分钟)，必填，1-1440
  price: number;             // 任务价格，必填，>0
  requirements?: string;      // 特殊要求，可选，0-1000字符
  player_id?: number | null;  // 指定陪玩员ID，可选
  dispatcher_id: number;     // 派单员ID，必填
}
```

**输出结果**:
```typescript
interface TaskResponse {
  success: boolean;
  data: {
    task: {
      id: number;
      customer_name: string;
      customer_contact: string;
      game_name: string;
      game_mode: string;
      duration: number;
      price: number;
      requirements?: string;
      dispatcher_id: number;
      player_id?: number;
      status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
      created_at: string;
      dispatcher_name?: string;
      player_name?: string;
    };
  };
  message: string;
}
```

**验证规则**:
- 客户姓名：不允许特殊字符
- 联系方式：支持手机号或QQ号格式
- 游戏名称：不允许为空
- 时长：1-1440分钟（24小时）
- 价格：大于0的数字

### 2.2 任务分配

#### 2.2.1 指定陪玩员
**功能描述**: 为任务指定具体的陪玩员执行

**业务规则**:
- 只能为pending状态的任务指定陪玩员
- 指定的陪玩员必须处于空闲状态
- 指定后任务状态自动变为accepted
- 陪玩员会收到任务分配通知

**输入参数**:
```typescript
interface AssignTaskRequest {
  taskId: number;     // 任务ID，必填
  playerId: number;   // 陪玩员ID，必填
}
```

**输出结果**:
```typescript
interface AssignTaskResponse {
  success: boolean;
  data: {
    taskId: number;
    playerId: number;
    newStatus: string;
    assignedAt: string;
    playerNotified: boolean;
  };
  message: string;
}
```

### 2.3 任务状态流转

#### 2.3.1 接受任务
**功能描述**: 陪玩员接受分配的任务

**业务规则**:
- 只有pending状态的任务可以接受
- 接受后任务状态变为accepted
- 陪玩员状态自动变为busy
- 派单员收到接受通知

**输入参数**:
```typescript
interface AcceptTaskRequest {
  taskId: number;     // 任务ID，必填
}
```

**输出结果**:
```typescript
interface AcceptTaskResponse {
  success: boolean;
  data: {
    taskId: number;
    status: 'accepted';
    acceptedAt: string;
    playerId: number;
  };
  message: string;
}
```

#### 2.3.2 开始任务
**功能描述**: 陪玩员开始执行任务，启动倒计时

**业务规则**:
- 只有accepted状态的任务可以开始
- 开始后任务状态变为in_progress
- 自动启动倒计时功能
- 记录任务开始时间

**输入参数**:
```typescript
interface StartTaskRequest {
  taskId: number;     // 任务ID，必填
}
```

**输出结果**:
```typescript
interface StartTaskResponse {
  success: boolean;
  data: {
    taskId: number;
    status: 'in_progress';
    startedAt: string;
    duration: number;     // 任务时长(分钟)
    remainingTime: number; // 剩余时间(秒)
  };
  message: string;
}
```

#### 2.3.3 完成任务
**功能描述**: 陪玩员完成任务，结束倒计时

**业务规则**:
- 只有in_progress状态的任务可以完成
- 完成后任务状态变为completed
- 陪玩员状态自动变为idle
- 记录任务完成时间和统计信息

**输入参数**:
```typescript
interface CompleteTaskRequest {
  taskId: number;     // 任务ID，必填
  summary?: string;   // 工作总结，可选
}
```

**输出结果**:
```typescript
interface CompleteTaskResponse {
  success: boolean;
  data: {
    taskId: number;
    status: 'completed';
    completedAt: string;
    duration: number;     // 实际执行时长(分钟)
    earnings: number;     // 预计收入
  };
  message: string;
}
```

### 2.4 任务查询

#### 2.4.1 获取任务列表
**功能描述**: 根据条件查询任务列表

**业务规则**:
- 支持分页查询
- 支持多条件筛选
- 支持排序功能
- 返回任务完整信息

**输入参数**:
```typescript
interface GetTasksRequest {
  page?: number;              // 页码，默认1
  limit?: number;             // 每页数量，默认20
  status?: string;             // 任务状态筛选
  playerId?: number;          // 陪玩员ID筛选
  dispatcherId?: number;      // 派单员ID筛选
  startDate?: string;          // 开始日期
  endDate?: string;            // 结束日期
  sortBy?: string;             // 排序字段
  sortOrder?: 'asc' | 'desc';   // 排序方向
}
```

**输出结果**:
```typescript
interface TasksListResponse {
  success: boolean;
  data: {
    tasks: Task[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}
```

## ⏱️ 计时管理模块

### 3.1 倒计时功能

#### 3.1.1 启动倒计时
**功能描述**: 为任务启动精确的倒计时

**业务规则**:
- 倒计时精度为秒级
- 支持小时、分钟、秒显示格式
- 超过60分钟显示为 HH:MM:SS
- 60分钟内显示为 MM:SS
- 倒计时结束时自动完成任务

**输入参数**:
```typescript
interface StartTimerRequest {
  taskId: number;     // 任务ID，必填
  duration: number;   // 任务时长(分钟)，必填
}
```

**输出结果**:
```typescript
interface TimerResponse {
  success: boolean;
  data: {
    taskId: number;
    remainingTime: number;   // 剩余时间(秒)
    formattedTime: string;    // 格式化时间显示
    isRunning: boolean;       // 是否正在运行
    startedAt: string;
  };
  message: string;
}
```

#### 3.1.2 暂停/恢复倒计时
**功能描述**: 允许暂停和恢复任务倒计时

**业务规则**:
- 只有in_progress状态的任务可以暂停
- 暂停时记录暂停原因和剩余时间
- 恢复时从剩余时间继续计时
- 暂停时间不计入任务时长

**输入参数**:
```typescript
interface PauseTimerRequest {
  taskId: number;     // 任务ID，必填
  reason?: string;     // 暂停原因，可选
}

interface ResumeTimerRequest {
  taskId: number;     // 任务ID，必填
}
```

**输出结果**:
```typescript
interface TimerControlResponse {
  success: boolean;
  data: {
    taskId: number;
    action: 'paused' | 'resumed';
    remainingTime: number;
    pausedDuration?: number;  // 暂停时长(秒)
    reason?: string;
    timestamp: string;
  };
  message: string;
}
```

### 3.2 时间统计

#### 3.2.1 获取时间统计
**功能描述**: 获取任务的时间相关统计信息

**业务规则**:
- 统计实际执行时间
- 计算暂停时间
- 分析时间效率
- 生成时间报告

**输入参数**:
```typescript
interface GetTimeStatsRequest {
  taskId: number;     // 任务ID，必填
}
```

**输出结果**:
```typescript
interface TimeStatsResponse {
  success: boolean;
  data: {
    taskId: number;
    plannedDuration: number;    // 计划时长(分钟)
    actualDuration: number;     // 实际时长(分钟)
    pausedDuration: number;     // 暂停时长(分钟)
    efficiency: number;          // 时间效率(%)
    overtime: number;           // 超时时间(分钟)
    timeBreakdown: {
      working: number;           // 工作时间(分钟)
      paused: number;            // 暂停时间(分钟)
      overtime: number;          // 超时时间(分钟)
    };
  };
  message: string;
}
```

## 📡 实时通信模块

### 4.1 WebSocket事件

#### 4.1.1 客户端 → 服务器事件

**任务相关事件**:
```typescript
// 接受任务
interface AcceptTaskEvent {
  type: 'accept_task';
  data: {
    taskId: number;
  };
}

// 开始任务
interface StartTaskEvent {
  type: 'start_task';
  data: {
    taskId: number;
  };
}

// 完成任务
interface CompleteTaskEvent {
  type: 'complete_task';
  data: {
    taskId: number;
    summary?: string;
  };
}

// 暂停任务
interface PauseTaskEvent {
  type: 'pause_task';
  data: {
    taskId: number;
    reason: string;
  };
}

// 恢复任务
interface ResumeTaskEvent {
  type: 'resume_task';
  data: {
    taskId: number;
  };
}

// 状态变更
interface StatusChangeEvent {
  type: 'status_change';
  data: {
    status: 'idle' | 'busy' | 'offline';
    reason?: string;
  };
}
```

#### 4.1.2 服务器 → 客户端事件

**任务通知事件**:
```typescript
// 新任务通知
interface NewTaskEvent {
  type: 'new_task';
  data: {
    task: Task;
  };
}

// 任务状态变更
interface TaskStatusChangedEvent {
  type: 'task_status_changed';
  data: {
    taskId: number;
    oldStatus: string;
    newStatus: string;
    changedBy: number;
    changedAt: string;
  };
}

// 任务倒计时更新
interface TimerUpdateEvent {
  type: 'timer_update';
  data: {
    taskId: number;
    remainingTime: number;
    formattedTime: string;
    isRunning: boolean;
  };
}

// 任务完成
interface TaskCompletedEvent {
  type: 'task_completed';
  data: {
    taskId: number;
    completedAt: string;
    earnings: number;
  };
}
```

**用户状态事件**:
```typescript
// 用户上线
interface UserOnlineEvent {
  type: 'user_online';
  data: {
    user: {
      id: number;
      username: string;
      role: string;
      status: string;
    };
  };
}

// 用户下线
interface UserOfflineEvent {
  type: 'user_offline';
  data: {
    user: {
      id: number;
      username: string;
      role: string;
    };
  };
}

// 用户状态变更
interface UserStatusChangedEvent {
  type: 'user_status_changed';
  data: {
    userId: number;
    oldStatus: string;
    newStatus: string;
    reason?: string;
    changedAt: string;
  };
}
```

### 4.2 连接管理

#### 4.2.1 连接认证
**功能描述**: WebSocket连接的身份验证和授权

**业务规则**:
- 使用JWT token进行身份验证
- 验证用户权限和角色
- 记录连接状态
- 处理连接异常

**认证流程**:
```typescript
interface SocketAuth {
  token: string;        // JWT token
  userId: number;
  role: 'dispatcher' | 'player';
}
```

#### 4.2.2 房间管理
**功能描述**: 基于用户角色和ID的房间管理

**房间规则**:
- 派单员加入 `dispatchers` 房间
- 每个用户加入个人房间 `user_{userId}`
- 陪玩员加入 `players` 房间
- 支持按任务ID创建临时房间

**房间事件**:
```typescript
// 加入房间
interface JoinRoomEvent {
  type: 'join_room';
  data: {
    room: string;
  };
}

// 离开房间
interface LeaveRoomEvent {
  type: 'leave_room';
  data: {
    room: string;
  };
}
```

## 📊 数据统计模块

### 5.1 任务统计

#### 5.1.1 获取任务统计
**功能描述**: 获取任务相关的统计数据

**业务规则**:
- 支持按时间范围统计
- 支持按用户角色统计
- 计算完成率和平均时长
- 生成趋势分析数据

**输入参数**:
```typescript
interface GetTaskStatsRequest {
  startDate?: string;    // 开始日期，格式 YYYY-MM-DD
  endDate?: string;      // 结束日期，格式 YYYY-MM-DD
  dispatcherId?: number; // 派单员ID筛选
  playerId?: number;     // 陪玩员ID筛选
  groupBy?: 'day' | 'week' | 'month'; // 分组方式
}
```

**输出结果**:
```typescript
interface TaskStatsResponse {
  success: boolean;
  data: {
    totalTasks: number;          // 总任务数
    completedTasks: number;      // 已完成任务数
    pendingTasks: number;        // 待接受任务数
    inProgressTasks: number;     // 进行中任务数
    completionRate: number;      // 完成率(%)
    averageDuration: number;     // 平均时长(分钟)
    totalEarnings: number;       // 总收入
    timeSeries: Array<{
      date: string;              // 日期
      total: number;             // 任务数
      completed: number;         // 完成数
      earnings: number;          // 收入
    }>;
    userStats?: Array<{
      userId: number;
      username: string;
      completedTasks: number;
      totalEarnings: number;
      averageRating?: number;
    }>;
  };
  message: string;
}
```

### 5.2 用户统计

#### 5.2.1 获取用户统计
**功能描述**: 获取用户相关的统计数据

**业务规则**:
- 区分派单员和陪玩员统计
- 计算工作时长和效率
- 分析收入趋势
- 生成排行榜

**输入参数**:
```typescript
interface GetUserStatsRequest {
  userId?: number;       // 用户ID，不传则获取所有用户
  role?: 'dispatcher' | 'player'; // 用户角色筛选
  startDate?: string;   // 开始日期
  endDate?: string;     // 结束日期
  limit?: number;       // 返回数量限制
}
```

**输出结果**:
```typescript
interface UserStatsResponse {
  success: boolean;
  data: {
    totalUsers: number;          // 总用户数
    activeUsers: number;         // 活跃用户数
    userStats: Array<{
      userId: number;
      username: string;
      role: string;
      status: string;
      totalTasks: number;
      completedTasks: number;
      totalEarnings: number;
      averageDuration: number;
      completionRate: number;
      lastActive: string;
    }>;
    rankings?: {
      topEarners: Array<{        // 收入排行榜
        userId: number;
        username: string;
        earnings: number;
      }>;
      mostProductive: Array<{    // 生产力排行榜
        userId: number;
        username: string;
        completedTasks: number;
      }>;
      highestRated: Array<{      // 评分排行榜
        userId: number;
        username: string;
        rating: number;
      }>;
    };
  };
  message: string;
}
```

## 🎯 验收标准

### 功能完整性验收
- [ ] 所有API端点按规范实现
- [ ] 所有WebSocket事件正常工作
- [ ] 数据验证和错误处理完善
- [ ] 业务逻辑符合需求规格

### 性能验收
- [ ] API响应时间 < 500ms
- [ ] WebSocket消息延迟 < 100ms
- [ ] 页面加载时间 < 2s
- [ ] 并发用户支持 > 100

### 安全性验收
- [ ] 用户认证和授权正确实现
- [ ] 输入验证和SQL注入防护
- [ ] 敏感数据加密存储
- [ ] API访问权限控制

### 可用性验收
- [ ] 系统可用性 > 99.5%
- [ ] 错误恢复机制正常
- [ ] 数据备份和恢复功能
- [ ] 监控和告警系统

---

*本文档详细描述了陪玩管理系统的所有功能需求和技术规格，作为开发和验收的重要依据。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 技术团队