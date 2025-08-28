# 开发指南

## 🚀 快速开始

本指南将帮助你快速搭建陪玩管理系统的开发环境，并了解项目的开发流程和最佳实践。

### 环境要求

#### 必需软件
- **Node.js**: v18.0 或更高版本
- **MySQL**: v8.0 或更高版本  
- **Redis**: v6.0 或更高版本 (可选，用于缓存)
- **Git**: 版本控制工具

#### 开发工具
- **VS Code**: 推荐的代码编辑器
- **Docker**: 容器化部署 (可选)
- **Postman**: API测试工具

### 项目结构

```
playmanager/
├── docs/                    # 项目文档
├── backend/                 # 后端项目
│   ├── src/
│   ├── package.json
│   └── server.js
├── frontend-react/          # 前端项目 (React)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── frontend/               # 前端项目 (原生JS - 已废弃)
└── scripts/               # 数据库脚本
```

## 🛠️ 环境搭建

### 1. 克隆项目

```bash
# 克隆项目到本地
git clone <repository-url>
cd playmanager

# 安装依赖
npm install
```

### 2. 数据库配置

#### 安装MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS (使用 Homebrew)
brew install mysql

# Windows
# 下载并安装 MySQL Community Server
```

#### 创建数据库
```sql
-- 创建数据库
CREATE DATABASE playmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'playmanager'@'localhost' IDENTIFIED BY 'your_password';

-- 授权用户
GRANT ALL PRIVILEGES ON playmanager.* TO 'playmanager'@'localhost';
FLUSH PRIVILEGES;
```

#### 运行初始化脚本
```bash
# 运行数据库初始化脚本
cd scripts
mysql -u root -p playmanager < init-db.sql

# 运行时区修复脚本
mysql -u root -p playmanager < fix-timezone.sql
```

### 3. 环境变量配置

#### 后端环境变量
创建 `backend/.env` 文件：

```bash
# backend/.env
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=playmanager
DB_PASSWORD=your_password
DB_DATABASE=playmanager

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 日志配置
LOG_LEVEL=info
```

#### 前端环境变量
创建 `frontend-react/.env.development` 文件：

```bash
# frontend-react/.env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_TITLE=陪玩管理系统
VITE_LOG_LEVEL=debug
```

### 4. 启动开发服务器

#### 后端启动
```bash
cd backend
npm run dev
```

#### 前端启动
```bash
cd frontend-react
npm run dev
```

#### 访问应用
- 前端应用: http://localhost:5173
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/api-docs (如果配置了)

### 5. 脚本管理和验证

PlayManagerV2 提供了统一的脚本管理系统，用于系统初始化、测试和调试。

#### 快速系统验证
```bash
# 运行快速测试套件验证系统状态
node scripts/script-manager.js quick

# 查看所有可用脚本
node scripts/script-manager.js help
```

#### 数据库初始化和验证
```bash
# 初始化数据库（包含超级管理员账户）
node scripts/script-manager.js database init

# 验证数据库完整性
node scripts/script-manager.js database validate

# 修复时区问题
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE < scripts/fix-timezone.sql
```

#### 超级管理员管理
```bash
# 激活超级管理员账户
node scripts/script-manager.js user activate-super-admin

# 重置超级管理员密码
node scripts/script-manager.js user reset-superadmin

# 完整的超级管理员管理工具
node scripts/utils/super-admin-manager.js
```

#### API和功能测试
```bash
# 测试后端API接口
node scripts/script-manager.js api test-backend

# 检查玩家任务数据显示
node scripts/script-manager.js api check-player-tasks

# 运行完整系统测试
node scripts/script-manager.js full
```

#### 开发时常用脚本
```bash
# 日常开发流程
## 1. 启动服务
cd backend && npm run dev
cd frontend && npm run dev

## 2. 验证系统状态
node scripts/script-manager.js quick

## 3. 开发新功能...

## 4. 测试新功能
node scripts/script-manager.js api test-backend

## 5. 验证数据库
node scripts/script-manager.js database validate
```

## 📝 开发工作流程

### Git工作流

#### 分支策略
```
main                    # 主分支 (生产环境)
├── develop            # 开发分支
├── feature/auth-system # 功能分支
├── bugfix/login-issue  # Bug修复分支
└── hotfix/security-fix # 紧急修复分支
```

#### 提交规范
```bash
# 提交信息格式
<type>(<scope>): <subject>

# 类型说明
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建或工具变动

# 示例
feat(auth): 添加JWT认证功能
fix(login): 修复登录页面验证错误
docs(api): 更新API文档
```

#### 开发流程
```bash
# 1. 从develop分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. 开发并提交代码
git add .
git commit -m "feat(your-feature): 添加新功能"

# 3. 推送到远程分支
git push origin feature/your-feature-name

# 4. 创建Pull Request
# 在GitHub/GitLab上创建PR到develop分支

# 5. 代码审查和合并
# 等待团队成员审查，通过后合并到develop分支
```

### 代码规范

#### TypeScript规范
```typescript
// 使用接口定义类型
interface User {
  id: number;
  username: string;
  role: 'dispatcher' | 'player';
  status: 'idle' | 'busy' | 'offline';
}

// 使用类型别名
type TaskStatus = 'pending' | 'accepted' | 'in_progress' | 'completed';

// 避免使用any类型
const getUser = (id: number): User | null => {
  // 实现
};

// 使用泛型
const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    return response.json();
  }
};
```

#### React规范
```tsx
// 使用函数组件和Hooks
import React, { useState, useEffect } from 'react';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsLoading(true);
    try {
      await onStatusChange(task.id, newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="task-card">
      <h3>{task.game_name}</h3>
      <p>{task.customer_name}</p>
      <button
        onClick={() => handleStatusChange('accepted')}
        disabled={isLoading}
      >
        {isLoading ? '处理中...' : '接受任务'}
      </button>
    </div>
  );
};

export default TaskCard;
```

#### 后端规范
```typescript
// 使用Controller-Service-Repository架构
// controllers/task.controller.ts
import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.taskService.createTask(req.body);
      res.status(201).json({
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

// services/task.service.ts
export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async createTask(taskData: CreateTaskDto): Promise<Task> {
    // 业务逻辑
    return this.taskRepository.create(taskData);
  }
}
```

### 测试规范

#### 单元测试
```typescript
// 使用Jest进行单元测试
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../components/TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    id: 1,
    game_name: '英雄联盟',
    customer_name: '张三',
    status: 'pending' as const,
  };

  const mockOnStatusChange = jest.fn();

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

    expect(screen.getByText('英雄联盟')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('点击按钮应该调用onStatusChange', () => {
    render(
      <TaskCard 
        task={mockTask} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    fireEvent.click(screen.getByText('接受任务'));
    expect(mockOnStatusChange).toHaveBeenCalledWith(1, 'accepted');
  });
});
```

#### API测试
```typescript
// 使用Supertest进行API测试
import request from 'supertest';
import app from '../app';

describe('Task API', () => {
  let authToken: string;

  beforeAll(async () => {
    // 登录获取token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'dispatcher',
        password: 'password',
      });
    authToken = response.body.data.token;
  });

  describe('POST /api/tasks', () => {
    it('应该创建新任务', async () => {
      const taskData = {
        customer_name: '李四',
        customer_contact: '13800138000',
        game_name: 'Valorant',
        game_mode: '竞技模式',
        duration: 60,
        price: 100,
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game_name).toBe('Valorant');
    });
  });
});
```

## 🔧 调试指南

### 前端调试

#### React DevTools
1. 安装React Developer Tools浏览器扩展
2. 使用组件检查器查看组件状态和props
3. 使用Profiler分析组件性能

#### Console调试
```typescript
// 使用console.log调试
const handleTaskUpdate = (task: Task) => {
  console.log('任务更新:', task);
  setTasks(prev => prev.map(t => t.id === task.id ? task : t));
};

// 使用console.group组织日志
console.group('任务创建');
console.log('输入数据:', taskData);
console.log('API响应:', response);
console.groupEnd();
```

#### 网络调试
```typescript
// 拦截API请求
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(request => {
  console.log('API请求:', request);
  return request;
});

api.interceptors.response.use(response => {
  console.log('API响应:', response);
  return response;
}, error => {
  console.error('API错误:', error);
  return Promise.reject(error);
});
```

### 后端调试

#### Node.js调试
```bash
# 使用VS Code调试
# 1. 在VS Code中打开项目
# 2. 按F5启动调试
# 3. 设置断点进行调试

# 使用Chrome DevTools
node --inspect-brk=9229 server.js
```

#### 日志调试
```typescript
// 使用Winston进行结构化日志
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 在代码中使用日志
logger.info('任务创建成功', { taskId: task.id });
logger.error('任务创建失败', { error: error.message, stack: error.stack });
```

### 数据库调试

#### 查询日志
```sql
-- 启用MySQL查询日志
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';

-- 查看查询日志
SELECT * FROM mysql.general_log 
WHERE argument LIKE '%tasks%' 
ORDER BY event_time DESC;
```

#### 性能分析
```sql
-- 慢查询分析
SELECT * FROM mysql.slow_log 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY query_time DESC;

-- 执行计划分析
EXPLAIN SELECT * FROM tasks 
WHERE dispatcher_id = 1 AND status = 'pending'
ORDER BY created_at DESC;
```

## 🐛 常见问题

### 开发环境问题

#### 1. 端口冲突
```bash
# 查看端口占用
lsof -i :3000  # macOS
netstat -ano | findstr :3000  # Windows

# 杀死进程
kill -9 <PID>  # macOS
taskkill /PID <PID> /F  # Windows
```

#### 2. 数据库连接失败
```bash
# 检查MySQL服务状态
sudo service mysql status  # Ubuntu/Debian
brew services list | grep mysql  # macOS

# 重启MySQL服务
sudo service mysql restart  # Ubuntu/Debian
brew services restart mysql  # macOS
```

#### 3. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install
```

#### 4. 脚本执行问题
```bash
# 脚本权限问题（Linux/macOS）
chmod +x scripts/script-manager.js

# Node.js版本不兼容
node --version  # 确保使用18.x或更高版本

# 配置文件问题
# 检查scripts/config/config.js中的配置是否正确
# 特别是API_BASE_URL和数据库配置

# 使用脚本管理器诊断
node scripts/script-manager.js help
```

### 系统诊断和验证

#### 使用脚本进行系统诊断
```bash
# 完整系统诊断
node scripts/script-manager.js full

# 数据库问题诊断
node scripts/script-manager.js database validate

# API连接问题诊断
node scripts/script-manager.js api test-backend

# 玩家任务显示问题诊断
node scripts/script-manager.js api check-player-tasks
```

#### 超级管理员相关问题
```bash
# 超级管理员登录失败
node scripts/script-manager.js user reset-superadmin

# 超级管理员账户不存在
node scripts/script-manager.js user activate-super-admin

# Socket.IO连接被拒绝
# 检查后端日志，确认超级管理员账户存在
```

#### 实时功能问题
```bash
# Socket.IO连接问题
## 1. 检查后端服务是否运行
cd backend && npm run dev

## 2. 检查CORS配置
## 确认frontend/src/lib/socket.ts中的URL配置正确

## 3. 检查认证状态
## 确认用户已登录，JWT token有效
```

### 代码问题

#### 1. TypeScript类型错误
```typescript
// 问题：使用了any类型
const data: any = response.data;

// 解决：定义具体类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const response: ApiResponse<Task> = await api.get('/api/tasks');
```

#### 2. React Hook错误
```typescript
// 问题：在条件语句中使用Hook
if (condition) {
  const [state, setState] = useState(false); // 错误
}

// 解决：将Hook移到组件顶部
const Component = () => {
  const [state, setState] = useState(false);
  
  if (condition) {
    // 使用state
  }
};
```

#### 3. 异步处理错误
```typescript
// 问题：没有正确处理异步错误
const fetchData = async () => {
  const response = await fetch('/api/data');
  const data = await response.json(); // 可能抛出错误
  setData(data);
};

// 解决：添加错误处理
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('获取数据失败:', error);
    setError(error.message);
  }
};
```

### 部署问题

#### 1. 构建失败
```bash
# 检查Node.js版本
node --version
npm --version

# 使用正确的Node.js版本
nvm use 18  # 如果使用nvm

# 清除缓存并重新构建
npm run clean
npm run build
```

#### 2. 环境变量配置
```bash
# 检查环境变量是否正确设置
echo $NODE_ENV
echo $DB_HOST

# 确保生产环境变量正确配置
# 在生产服务器上设置正确的.env文件
```

## 📚 扩展阅读

### 官方文档
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express Documentation](https://expressjs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

### 学习资源
- [MDN Web Docs](https://developer.mozilla.org/)
- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Learning Lab](https://lab.github.com/)
- [Frontend Masters](https://frontendmasters.com/)

### 工具推荐
- **代码编辑器**: VS Code, WebStorm
- **API测试**: Postman, Insomnia
- **数据库管理**: MySQL Workbench, DBeaver
- **版本控制**: GitKraken, SourceTree
- **设计工具**: Figma, Sketch

---

*本文档会根据项目发展持续更新，为开发团队提供最新的开发指南。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 开发团队