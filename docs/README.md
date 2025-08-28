# PlayManagerV2 Documentation

## 📚 文档导航 (Documentation Navigation)

本文档库提供了 PlayManagerV2 派单管理系统的完整技术文档和使用指南。

This documentation library provides comprehensive technical documentation and usage guides for the PlayManagerV2 dispatch management system.

### 🚀 快速开始 (Quick Start)

- **[项目概述 (Project Overview)](01-project-overview/README.md)** - 系统介绍和架构概览
- **[开发指南 (Development Guide)](02-development-guide/development-guide.md)** - 环境搭建和开发流程
- **[脚本工具 (Scripts & Utilities)](../scripts/README.md)** - 测试、数据库和实用工具脚本
- **[API 接口文档 (API Documentation)](03-technical-docs/api/backend-api.md)** - 完整的 RESTful API 参考

### 📖 文档结构 (Documentation Structure)

#### 01. 项目概览 (Project Overview)
- [系统介绍 (System Overview)](01-project-overview/README.md) - 项目背景、目标和技术栈

#### 02. 开发指南 (Development Guide)
- [开发环境配置 (Development Setup)](02-development-guide/development-guide.md) - 环境搭建、开发流程和代码规范
- [测试指南 (Testing Guide)](02-development-guide/testing-guide.md) - 测试策略和流程
- [部署指南 (Deployment Guide)](06-maintenance-docs/deployment/deployment-guide.md) - 生产环境部署

#### 03. 技术文档 (Technical Documentation)
- **API 文档**
  - [后端 API 参考 (Backend API Reference)](03-technical-docs/api/backend-api.md) - 完整的 RESTful API 文档
  - [API 集成指南 (API Integration Guide)](03-technical-docs/api/backend-api-guide.md) - 前端集成指南
- **数据库文档**
  - [数据库架构 (Database Schema)](03-technical-docs/database/database-schema.md) - 数据表结构和关系
  - [数据迁移 (Database Migrations)](03-technical-docs/database/migrations.md) - 数据库变更记录
- **系统架构**
  - [前端组件 (Frontend Components)](03-technical-docs/architecture/frontend-components.md) - React 组件说明
  - [系统架构 (System Architecture)](03-technical-docs/architecture/system-architecture.md) - 整体架构设计

#### 04. 功能模块 (Feature Modules)
- **核心功能**
  - [用户管理 (User Management)](04-feature-modules/core/user-management.md) - 用户系统说明
  - [任务管理 (Task Management)](04-feature-modules/core/task-management.md) - 任务系统说明
- **扩展功能**
  - [实时通信 (Real-time Communication)](04-feature-modules/extensions/realtime-communication.md) - Socket.IO 功能
  - [统计分析 (Statistics & Analytics)](04-feature-modules/extensions/statistics.md) - 数据统计功能

#### 05. 产品文档 (Product Documentation)
- **用户指南**
  - [派单员手册 (Dispatcher Manual)](05-product-docs/user-guides/dispatcher-guide.md) - 派单员使用指南
  - [陪玩员手册 (Player Manual)](05-product-docs/user-guides/player-guide.md) - 陪玩员使用指南
  - [管理员手册 (Admin Manual)](05-product-docs/user-guides/admin-guide.md) - 管理员使用指南
- **需求文档**
  - [功能需求 (Feature Requirements)](05-product-docs/requirements/feature-requirements.md) - 功能需求说明
  - [技术需求 (Technical Requirements)](05-product-docs/requirements/technical-requirements.md) - 技术需求说明

#### 06. 维护文档 (Maintenance Documentation)
- **部署运维**
  - [部署指南 (Deployment Guide)](06-maintenance-docs/deployment/deployment-guide.md) - 生产环境部署
  - [监控告警 (Monitoring & Alerting)](06-maintenance-docs/deployment/monitoring.md) - 系统监控
  - [备份恢复 (Backup & Recovery)](06-maintenance-docs/deployment/backup-recovery.md) - 数据备份
- **故障排除**
  - [常见问题 (FAQ)](06-maintenance-docs/troubleshooting/faq.md) - 常见问题解答
  - [错误代码 (Error Codes)](06-maintenance-docs/troubleshooting/error-codes.md) - 错误代码说明
  - [调试指南 (Debugging Guide)](06-maintenance-docs/troubleshooting/debugging.md) - 调试方法

### 🔄 版本信息 (Version Information)

- **当前版本**: v2.2.0
- **最后更新**: 2025-08-28
- **更新日志**: [CHANGELOG.md](CHANGELOG.md)
- **脚本工具**: [scripts/README.md](../scripts/README.md)

### 🎯 面向读者 (Target Audience)

#### 🛠️ 开发人员 (Developers)
- 快速上手：**项目概述** → **开发指南** → **脚本工具** → **API 文档**
- 深入开发：**技术文档** → **功能模块** → **维护文档**
- 开发工具：**脚本工具** 用于测试、数据库管理和系统维护

#### 📋 产品经理 (Product Managers)
- 功能了解：**项目概述** → **产品文档** → **功能模块**

#### 🧪 测试人员 (Testers)
- 测试准备：**项目概述** → **开发指南** → **产品文档**
- 测试执行：**脚本工具** → **技术文档** → **维护文档**
- 测试工具：**脚本工具** 包含完整的测试套件和诊断工具

#### 🔧 运维人员 (Operations)
- 系统部署：**项目概述** → **脚本工具** → **维护文档**
- 日常维护：**技术文档** → **脚本工具** → **维护文档**
- 运维工具：**脚本工具** 提供数据库管理、系统初始化和监控工具

### 📞 联系方式 (Contact)

如有问题或建议，请联系开发团队：
- 技术问题：查看 **故障排除** 文档
- 功能需求：查看 **产品文档** 中的需求说明
- 部署问题：查看 **部署指南**

---

**文档版本**: v2.2.0  
**最后更新**: 2025-08-28  
**维护团队**: PlayManagerV2 Development Team