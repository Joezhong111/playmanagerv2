# 脚本工具目录 (Scripts & Utilities)

本目录包含项目开发、测试和维护过程中使用的各种脚本工具。

## 📁 目录结构

```
scripts/
├── test/           # 测试脚本
│   ├── check-player-tasks.js      # 检查陪玩员任务状态
│   ├── check-user-status.js       # 检查用户状态一致性
│   ├── create-test-task.js        # 创建测试任务
│   ├── simple-test.js             # 简单功能测试
│   ├── test-backend-api.js        # 后端API测试
│   ├── test-player-status.js      # 陪玩员状态测试
│   ├── test-super-admin.js       # 超级管理员功能测试
│   ├── test-status-stability.js   # 状态稳定性测试
│   └── test-task-display-fix.js   # 任务显示修复验证
├── database/       # 数据库相关脚本
│   ├── add-overtime-column.sql     # 添加超时功能列
│   ├── check_player_tasks.sql      # 检查陪玩员任务SQL
│   ├── execute-db-update.js        # 执行数据库更新
│   ├── init-database.js            # 数据库初始化脚本
│   ├── init_super_admin.sql        # 超级管理员初始化
│   ├── migrate.js                  # 数据库迁移工具
│   ├── run_queue_migration.js      # 队列系统迁移
│   ├── update-database-schema.js   # 更新数据库架构
│   └── update-schema.js            # 更新架构工具
└── utils/          # 实用工具脚本
    ├── activate-super-admin.js      # 激活超级管理员账户
    └── reset-user-status.js        # 重置用户状态工具
```

## 🚀 使用指南

### 测试脚本 (Test Scripts)

#### 检查陪玩员任务状态
```bash
node scripts/test/check-player-tasks.js
```
- 检查指定陪玩员的任务分配和状态情况
- 验证任务显示逻辑是否正确

#### 检查用户状态一致性
```bash
node scripts/test/check-user-status.js
```
- 验证登录响应和用户详情的状态一致性
- 测试状态更新功能

#### 创建测试任务
```bash
node scripts/test/create-test-task.js
```
- 自动创建测试任务用于开发调试
- 支持指定派单员和陪玩员

#### 后端API测试
```bash
node scripts/test/test-backend-api.js
```
- 全面测试后端API端点
- 验证响应数据结构和权限控制

#### 超级管理员功能测试
```bash
node scripts/test/test-super-admin.js
```
- 测试超级管理员的特殊权限
- 验证用户管理和系统管理功能

### 数据库脚本 (Database Scripts)

#### 数据库初始化
```bash
node scripts/database/init-database.js
```
- 初始化数据库结构和基础数据
- 创建必要的表和索引

#### 激活超级管理员
```bash
node scripts/utils/activate-super-admin.js
```
- 激活系统超级管理员账户
- 设置默认管理员权限

#### 数据库迁移
```bash
node scripts/database/migrate.js
```
- 执行数据库结构迁移
- 更新表结构和约束

#### 队列系统迁移
```bash
node scripts/database/run_queue_migration.js
```
- 运行任务队列系统迁移
- 添加队列相关表和字段

### 实用工具 (Utilities)

#### 重置用户状态
```bash
node scripts/utils/reset-user-status.js
```
- 手动重置指定用户的状态
- 用于解决状态同步问题

#### 激活超级管理员
```bash
node scripts/utils/activate-super-admin.js
```
- 激活或重置超级管理员账户
- 设置系统管理员权限

## ⚠️ 注意事项

1. **生产环境使用**: 这些脚本主要用于开发和测试环境，在生产环境使用前请充分测试
2. **配置要求**: 运行脚本前确保后端服务正在运行（默认端口3003）
3. **数据安全**: 部分脚本会修改数据库数据，请在测试环境使用
4. **权限要求**: 某些脚本需要管理员权限才能正常运行

## 🔧 自定义脚本

如需添加新的脚本，请遵循以下规范：
1. 将脚本放置在对应的子目录中
2. 添加详细的注释和使用说明
3. 包含适当的错误处理
4. 遵循现有的代码风格和命名规范

## 📝 维护说明

- 定期清理过时的测试脚本
- 更新脚本以适配最新的API变更
- 保持脚本文档的及时更新