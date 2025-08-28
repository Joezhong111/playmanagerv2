# PlayManagerV2 项目文档索引

欢迎来到 PlayManagerV2 项目文档中心。这里提供了完整的项目文档，帮助您快速了解项目架构、开发流程和技术实现。

## 📚 文档目录

### 🏗️ 项目架构
- **[项目架构文档](./architecture.md)** - 系统整体架构设计、技术栈选择、模块划分
- **[数据库结构](./database-schema.md)** - 数据库表设计、关系模型、优化策略
- **[后端API文档](./backend-api.md)** - RESTful API设计、接口规范、中间件说明
- **[前端组件文档](./frontend-components.md)** - React组件设计、状态管理、UI组件库

### 🛠️ 开发指南
- **[开发指南](./development-guide.md)** - 环境搭建、开发流程、代码规范、测试部署

## 🎯 快速开始

### 新开发者入门
1. **环境搭建** → [开发指南 - 环境搭建](./development-guide.md#环境搭建)
2. **项目架构** → [项目架构文档](./architecture.md)
3. **数据库设计** → [数据库结构](./database-schema.md)
4. **API接口** → [后端API文档](./backend-api.md)
5. **前端组件** → [前端组件文档](./frontend-components.md)

### 功能开发
- **用户管理** → [项目架构 - 用户管理系统](./architecture.md#2-用户管理系统)
- **任务管理** → [项目架构 - 任务管理系统](./architecture.md#1-任务管理系统)
- **统计分析** → [项目架构 - 统计分析系统](./architecture.md#3-统计分析系统)
- **实时通信** → [项目架构 - 实时通信系统](./architecture.md#4-实时通信系统)

### 部署运维
- **生产部署** → [开发指南 - 部署指南](./development-guide.md#部署指南)
- **性能优化** → [开发指南 - 性能优化](./development-guide.md#性能优化)
- **监控日志** → [开发指南 - 监控和日志](./development-guide.md#监控和日志)

## 📖 文档详情

### 🏗️ 项目架构文档

**核心内容：**
- 系统架构图和技术栈
- 三大用户角色权限设计
- 模块化设计原则
- 数据流和通信机制

**适用人群：**
- 架构师
- 技术负责人
- 新入职开发者

**快速链接：**
- [技术架构](./architecture.md#技术架构)
- [用户角色](./architecture.md#系统角色)
- [核心功能](./architecture.md#核心功能模块)

### 🗄️ 数据库结构文档

**核心内容：**
- 完整的ER图和表结构
- 字段说明和索引设计
- 外键约束和数据完整性
- 性能优化策略

**适用人群：**
- 数据库管理员
- 后端开发者
- 系统架构师

**快速链接：**
- [数据表结构](./database-schema.md#数据表结构)
- [关系模型](./database-schema.md#数据库关系图)
- [初始化脚本](./database-schema.md#数据库初始化脚本)

### 🔌 后端API文档

**核心内容：**
- RESTful API设计规范
- 接口详细说明和示例
- 认证授权机制
- 错误处理和响应格式

**适用人群：**
- 后端开发者
- 前端开发者
- 测试工程师

**快速链接：**
- [API路由](./backend-api.md#api路由详解)
- [认证模块](./backend-api.md#1-认证模块)
- [任务管理](./backend-api.md#3-任务管理模块)

### 🎨 前端组件文档

**核心内容：**
- React组件设计模式
- UI组件库和样式系统
- 状态管理和Context API
- 自定义Hooks和工具函数

**适用人群：**
- 前端开发者
- UI设计师
- 测试工程师

**快速链接：**
- [项目结构](./frontend-components.md#项目结构)
- [核心组件](./frontend-components.md#核心组件详解)
- [Context设计](./frontend-components.md#5-context和hooks)

### 🛠️ 开发指南

**核心内容：**
- 环境搭建和配置
- 开发工作流程和规范
- 测试策略和工具
- 部署和运维指南

**适用人群：**
- 所有开发者
- 运维工程师
- 项目经理

**快速链接：**
- [环境搭建](./development-guide.md#开发环境搭建)
- [代码规范](./development-guide.md#代码规范)
- [测试指南](./development-guide.md#测试指南)

## 🔍 快速查找

### 按功能模块

| 功能模块 | 相关文档 | 关键章节 |
|---------|---------|---------|
| 用户认证 | [API文档](./backend-api.md) | 认证模块 |
| 任务管理 | [架构文档](./architecture.md) | 任务管理系统 |
| 实时通信 | [架构文档](./architecture.md) | 实时通信系统 |
| 数据统计 | [架构文档](./architecture.md) | 统计分析系统 |
| 前端UI | [组件文档](./frontend-components.md) | UI基础组件 |
| 数据库设计 | [数据库文档](./database-schema.md) | 数据表结构 |

### 按开发角色

| 开发角色 | 推荐文档 | 学习路径 |
|---------|---------|---------|
| 前端开发者 | [组件文档](./frontend-components.md) → [API文档](./backend-api.md) | 组件设计 → API调用 |
| 后端开发者 | [API文档](./backend-api.md) → [数据库文档](./database-schema.md) | 接口设计 → 数据存储 |
| 全栈开发者 | [架构文档](./architecture.md) → [开发指南](./development-guide.md) | 整体架构 → 开发流程 |
| 测试工程师 | [开发指南](./development-guide.md) → [API文档](./backend-api.md) | 测试策略 → 接口测试 |
| 运维工程师 | [开发指南](./development-guide.md) → [数据库文档](./database-schema.md) | 部署指南 → 数据库维护 |

## 🚀 快速开始命令

### 环境初始化
```bash
# 克隆项目
git clone <repository-url>
cd playmanagerv2

# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 配置环境变量
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 数据库初始化
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE dispatch_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入表结构
cd backend
mysql -u root -p dispatch_system < migrations/init.sql

# 或者使用Node.js脚本
node init-database.js
```

### 启动开发服务器
```bash
# 启动后端
cd backend
npm run dev

# 启动前端（新终端）
cd frontend
npm run dev
```

### 测试验证
```bash
# 后端API测试
cd backend
npm test

# 前端组件测试
cd frontend
npm test

# 端到端测试
npm run test:e2e
```

## 📞 获取帮助

### 常见问题
- **环境搭建问题** → [开发指南 - 环境搭建](./development-guide.md#开发环境搭建)
- **数据库连接问题** → [开发指南 - 故障排除](./development-guide.md#故障排除)
- **API调用问题** → [后端API文档](./backend-api.md)
- **前端组件问题** → [前端组件文档](./frontend-components.md)

### 技术支持
- 查看项目 [GitHub Issues](https://github.com/your-repo/issues)
- 阅读 [开发指南 - 最佳实践](./development-guide.md#最佳实践)
- 参考 [代码示例](./backend-api.md#代码示例)

## 📝 文档维护

### 更新日志
- **2024-01-01**: 初始文档版本发布
- **2024-01-15**: 添加超级管理员功能文档
- **2024-02-01**: 完善测试和部署指南

### 贡献指南
1. 文档使用 Markdown 格式
2. 遵循现有文档结构和风格
3. 提供代码示例和最佳实践
4. 保持文档的准确性和时效性

### 反馈建议
如果您发现文档中的问题或有改进建议，请：
1. 在 GitHub 上创建 Issue
2. 提交 Pull Request
3. 联系项目维护者

---

## 📖 附录

### 项目信息
- **项目名称**: PlayManagerV2
- **项目类型**: 游戏陪玩任务管理系统
- **技术栈**: Next.js + Express + MySQL + Socket.IO
- **开发团队**: 您的开发团队名称

### 相关链接
- [GitHub Repository](https://github.com/your-repo)
- [在线演示](https://your-demo-url.com)
- [API 文档](https://api-docs.your-domain.com)
- [部署地址](https://your-production-url.com)

### 版本信息
- **当前版本**: v2.0.0
- **最后更新**: 2024-01-01
- **文档版本**: v1.0.0

---

**祝您使用愉快！** 🎉

如有任何问题，欢迎随时联系我们或查看相关文档获取帮助。