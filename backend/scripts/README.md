# 数据库脚本管理

PlayManagerV2 数据库统一管理系统

## 🚀 快速开始

### 初始化数据库
```bash
# 方式1: 使用统一初始化脚本 (推荐)
node database-setup.js

# 方式2: 使用管理工具
node db-manager.js init
```

### 查看数据库状态
```bash
node db-manager.js status
```

## 📁 脚本说明

### 核心脚本
- **`database-setup.js`** - 统一数据库初始化脚本
  - 创建所有必要的表结构
  - 配置索引和外键约束
  - 创建超级管理员账户 (super_admin/admin123)
  - 初始化游戏字典数据
  - 创建存储过程和定时任务

- **`db-manager.js`** - 数据库管理工具
  - `init` - 完整初始化数据库
  - `status` - 查看数据库状态
  - `reset` - 重置数据库（清空数据）
  - `clean` - 清理过期数据
  - `help` - 显示帮助信息

### 管理工具脚本
- **`check-super-admin.js`** - 检查超级管理员状态
- **`verify-super-admin.js`** - 验证超级管理员账户
- **`super-admin-manager.js`** - 超级管理员管理工具
- **`diagnose-database.js`** - 数据库诊断工具

### 配置文件
- **`config.js`** - 数据库配置和工具函数
- **`tools.js`** - 通用工具函数

## 🗄️ 数据库结构

系统包含以下核心表：

### 用户相关
- `users` - 用户账户表
- `user_sessions` - 用户会话管理
- `user_statistics` - 用户统计数据

### 任务相关  
- `tasks` - 任务主表
- `task_logs` - 任务操作日志
- `time_extension_requests` - 时间延长申请

### 系统相关
- `system_statistics` - 系统统计数据
- `game_names` - 游戏字典

## 🔐 默认账户

系统会自动创建超级管理员账户：
- **用户名**: `super_admin`
- **密码**: `admin123`
- **角色**: `super_admin`

> ⚠️ 在生产环境中请及时修改默认密码！

## 📋 使用说明

### 首次部署
1. 确保MySQL/MariaDB服务已启动
2. 配置 `.env` 文件中的数据库连接信息
3. 运行初始化脚本：`node database-setup.js`
4. 验证初始化结果：`node db-manager.js status`

### 日常维护
```bash
# 查看数据库状态
node db-manager.js status

# 清理过期数据
node db-manager.js clean

# 检查超级管理员
node check-super-admin.js

# 诊断数据库问题
node diagnose-database.js
```

### 重新初始化
```bash
# 重置数据库（清空所有数据）
node db-manager.js reset

# 重新初始化
node db-manager.js init
```

## 🔧 环境要求

- Node.js 16+
- MySQL 8.0+ 或 MariaDB 10.6+
- 必要的 npm 包：`mysql2`, `bcrypt`, `dotenv`

## 📝 注意事项

1. **备份重要数据**: 在执行重置或初始化操作前，请确保已备份重要数据
2. **环境配置**: 确保 `.env` 文件配置正确
3. **权限设置**: 确保数据库用户有足够的权限执行DDL操作
4. **时区设置**: 系统使用 UTC+8 时区，确保数据库时区配置正确

## 🗂️ 文件归档

`backup/` 目录包含了旧版本的脚本文件，仅作备份参考使用。