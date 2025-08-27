# 派单管理系统 - Next.js Frontend

基于 Next.js 14、TypeScript、Tailwind CSS 和 Shadcn UI 构建的现代化游戏陪玩派单管理系统前端。

## 🚀 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件**: Shadcn UI
- **状态管理**: React Context + hooks
- **HTTP客户端**: Axios
- **实时通信**: Socket.io Client
- **通知系统**: Sonner
- **身份认证**: JWT + Cookie

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- 后端服务运行在 http://localhost:3003

### 安装依赖

```bash
cd frontend
npm install
```

### 环境配置

创建 `.env.local` 文件：

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3003/api

# Environment  
NODE_ENV=development
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 🎯 主要功能

### 🔐 认证系统
- JWT Token 认证
- 基于角色的路由保护
- 自动登录状态检查
- 安全的 Cookie 存储

### 👨‍💼 派单员功能
- **任务管理仪表盘**: 任务统计概览、任务列表查看和筛选、实时任务状态更新
- **创建任务**: 完整的任务信息填写表单、可选择指定陪玩员或开放接取
- **陪玩员管理**: 查看所有陪玩员状态、实时状态更新通知

### 🎮 陪玩员功能
- **个人工作台**: 个人任务统计、收入统计、状态快速切换
- **任务操作**: 浏览可接任务、接受/开始/完成任务、当前任务进度管理
- **实时通知**: 新任务提醒、任务状态变更通知

### 🔄 实时通信
- Socket.io 集成
- 实时任务状态同步
- 用户上线/下线状态
- 推送通知系统

## 🧪 测试账户

系统提供以下测试账户：

- **派单员**: `admin` / `dispatcher2` (密码: `admin123`)
- **陪玩员**: `player1` / `player2` (密码: `admin123`)

---

**文档版本**: v1.0  
**创建日期**: 2025-08-27  
**维护者**: Claude Code Assistant