# 🎮 PlayManager V2 - 游戏陪玩管理系统

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**现代化的游戏陪玩任务分发与管理平台**

</div>

## 📋 项目简介

PlayManager V2 是一个功能完善的游戏陪玩管理系统，支持任务创建、分发、实时跟踪和统计分析。采用现代化技术栈构建，提供流畅的用户体验和强大的管理功能。

### ✨ 核心功能

- 🎯 **智能任务分发** - 自动化任务分配和管理
- 📊 **实时数据统计** - 全面的业务数据分析
- 🔐 **多角色权限** - 派单员、陪玩员、超级管理员
- ⚡ **实时通信** - WebSocket 实现即时消息推送
- 📱 **响应式设计** - 支持多设备访问
- 🛡️ **安全认证** - JWT 身份验证与授权

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Context + Hooks
- **UI组件**: Radix UI + Shadcn/ui
- **HTTP客户端**: Axios
- **实时通信**: Socket.IO Client

### 后端技术栈
- **运行时**: Node.js 20+
- **框架**: Express.js
- **语言**: JavaScript (ES6+)
- **数据库**: MySQL 8.0+ (TiDB Cloud)
- **身份认证**: JWT
- **实时通信**: Socket.IO
- **日志管理**: Winston

### 开发工具
- **构建工具**: Turbopack (Next.js)
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **版本控制**: Git

## 📦 项目结构

```
playmanagerv2/
├── frontend/                 # Next.js 前端应用
│   ├── src/
│   │   ├── app/             # Next.js App Router 页面
│   │   ├── components/      # 可复用组件
│   │   ├── contexts/        # React Context 状态管理
│   │   ├── lib/            # 工具库和配置
│   │   └── types/          # TypeScript 类型定义
│   └── public/             # 静态资源
├── backend/                  # Node.js 后端应用
│   ├── config/             # 数据库和应用配置
│   ├── controllers/        # 控制器 (MVC)
│   ├── services/           # 业务逻辑层
│   ├── repositories/       # 数据访问层
│   ├── routes/            # API 路由定义
│   ├── middleware/        # 中间件
│   ├── sockets/           # Socket.IO 事件处理
│   └── utils/             # 工具函数
├── scripts/                  # 开发和维护脚本
├── docs/                    # 项目文档
└── README.md               # 项目说明文档
```

## 🚀 快速开始

### 环境要求

- Node.js 20.0+
- MySQL 8.0+ 或 TiDB
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd playmanagerv2
```

2. **安装依赖**
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend  
npm install
```

3. **配置环境变量**

**后端配置 (`backend/.env`):**
```env
# 服务器配置
PORT=3003
NODE_ENV=development

# 数据库配置
DB_HOST=your-db-host
DB_PORT=4000
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=your-database

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS 配置
ALLOWED_ORIGINS=http://localhost:3000
```

**前端配置 (`frontend/.env.local`):**
```env
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3003/api

# 环境配置
NODE_ENV=development
```

4. **初始化数据库**
```bash
cd backend
npm run db:init
```

5. **启动服务**
```bash
# 启动后端 (端口: 3003)
cd backend
npm run dev

# 启动前端 (端口: 3000)
cd frontend
npm run dev
```

6. **访问应用**
- 前端地址: http://localhost:3000
- 后端地址: http://localhost:3003
- API 文档: http://localhost:3003/api-docs

## 👥 用户角色

### 🎯 派单员 (Dispatcher)
- 创建和管理游戏任务
- 分配任务给陪玩员
- 监控任务进度和状态
- 处理时长延期请求

### 🎮 陪玩员 (Player)  
- 查看和接受可用任务
- 管理个人任务状态
- 申请任务时长延期
- 查看收益统计

### 🛡️ 超级管理员 (Super Admin)
- 用户账户管理
- 系统数据统计
- 游戏字典管理
- 系统健康监控

## 🔧 开发命令

### 后端开发
```bash
cd backend

# 开发模式 (热重载)
npm run dev

# 生产构建
npm run build
npm start

# 数据库操作
npm run db:init      # 初始化数据库
npm run db:migrate   # 运行迁移
npm run test:db      # 测试数据库连接

# 工具脚本
npm run test-timezone    # 测试时区配置
```

### 前端开发
```bash
cd frontend

# 开发模式 (Turbopack)
npm run dev

# 生产构建
npm run build
npm start

# 代码检查
npm run lint        # ESLint 检查
npm run type-check  # TypeScript 检查
```

### 实用脚本
```bash
# 测试和诊断
node scripts/test/check-player-tasks.js
node scripts/test/test-backend-api.js

# 数据库管理
node scripts/database/init-database.js
node scripts/utils/activate-super-admin.js

# 系统维护
node scripts/utils/reset-user-status.js
```

## 🌐 部署指南

### 生产环境部署

1. **环境配置**
```bash
# 前端生产环境配置
echo "NEXT_PUBLIC_API_URL=https://your-domain.com/api" > frontend/.env.production

# 后端生产环境配置  
echo "ALLOWED_ORIGINS=https://your-domain.com" >> backend/.env
```

2. **构建应用**
```bash
# 构建前端
cd frontend && npm run build

# 启动后端
cd backend && npm start
```

3. **反向代理配置 (Nginx)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3003/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 前端代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

详细部署文档请参考: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📊 核心功能模块

### 任务管理系统
- ✅ 任务创建、编辑、删除
- ✅ 任务状态流转 (待接单→进行中→已完成)
- ✅ 任务分配和重新分配
- ✅ 任务时长管理和延期申请
- ✅ 实时任务状态同步

### 用户权限系统
- ✅ JWT 身份认证
- ✅ 基于角色的访问控制 (RBAC)
- ✅ 会话管理和自动登出
- ✅ 密码安全和重置

### 实时通信系统
- ✅ Socket.IO 实时消息推送
- ✅ 任务状态实时更新
- ✅ 用户在线状态管理
- ✅ 系统通知和提醒

### 数据统计分析
- ✅ 用户业绩统计
- ✅ 任务完成率分析
- ✅ 收益报表生成
- ✅ 系统运行状态监控

## 🛠️ API 文档

### 认证接口
```javascript
POST /api/auth/login      # 用户登录
POST /api/auth/register   # 用户注册
GET  /api/auth/verify     # Token 验证
POST /api/auth/logout     # 用户登出
```

### 任务管理
```javascript
GET    /api/tasks         # 获取任务列表
POST   /api/tasks         # 创建任务
PUT    /api/tasks/:id     # 更新任务
DELETE /api/tasks/:id     # 删除任务
POST   /api/tasks/:id/accept    # 接受任务
POST   /api/tasks/:id/complete  # 完成任务
```

### 用户管理
```javascript
GET    /api/users         # 获取用户列表
GET    /api/users/profile # 获取个人信息
PUT    /api/users/profile # 更新个人信息
PUT    /api/users/status  # 更新用户状态
```

### 统计数据
```javascript
GET /api/stats/overview   # 系统概览
GET /api/stats/tasks      # 任务统计
GET /api/stats/revenue    # 收益统计
GET /api/stats/users      # 用户统计
```

完整 API 文档: [API.md](./docs/API.md)

## 🔍 故障排除

### 常见问题

**1. 数据库连接失败**
- 检查数据库配置和网络连通性
- 验证用户名密码和权限设置
- 确认时区设置正确

**2. CORS 跨域错误**  
- 检查 `ALLOWED_ORIGINS` 环境变量
- 确认前后端端口配置一致
- 验证 API 基础 URL 设置

**3. Socket 连接问题**
- 检查 WebSocket 端口访问权限
- 确认防火墙和代理设置
- 验证 JWT Token 有效性

**4. 构建失败**
- 清除构建缓存: `rm -rf .next`
- 重新安装依赖: `npm ci`
- 检查 TypeScript 类型错误

### 日志查看
```bash
# 后端日志
tail -f backend/logs/app.log

# 数据库连接日志
npm run test:db

# 系统健康检查
curl http://localhost:3003/health
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请遵循以下流程：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 编写有意义的提交信息
- 添加必要的单元测试
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 👨‍💻 开发团队

- **项目维护者**: [您的姓名]
- **技术支持**: [联系方式]
- **问题反馈**: [GitHub Issues]

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

<div align="center">

**🎮 让游戏陪玩管理更简单高效！**

[开始使用](#🚀-快速开始) · [查看文档](./docs/) · [报告问题](./issues) · [功能请求](./discussions)

</div>