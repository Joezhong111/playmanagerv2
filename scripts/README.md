# PlayManagerV2 脚本目录

本目录包含所有测试、调试和维护脚本，用于PlayManagerV2系统的开发、测试和部署。

## 📁 目录结构

```
scripts/
├── config/              # 配置文件
│   └── config.js        # 统一配置文件
├── utils/              # 工具类脚本
│   ├── tools.js        # 统一工具库
│   ├── activate-super-admin.js  # 超级管理员激活脚本
│   ├── super-admin-manager.js    # 超级管理员管理工具
│   └── config/         # 数据库配置
│       └── database.js # 数据库连接配置
├── database/           # 数据库相关脚本
│   ├── init-database.js         # 数据库初始化脚本
│   └── init_super_admin.sql     # SQL初始化脚本
├── test/               # 测试脚本
│   ├── test-backend-api.js      # 后端API测试
│   ├── check-player-tasks.js    # 玩家任务检查
│   ├── system-test-suite.js     # 系统测试套件
│   ├── task-lifecycle-test.js   # 任务生命周期测试
│   └── database-validator.js    # 数据库验证脚本
├── script-manager.js   # 脚本管理器（主入口）
└── README.md           # 本文档
```

## 🚀 快速开始

### 1. 脚本管理器

使用脚本管理器可以方便地执行所有脚本：

```bash
# 查看帮助
node scripts/script-manager.js help

# 快速测试套件
node scripts/script-manager.js quick

# 完整测试套件
node scripts/script-manager.js full

# 执行特定脚本
node scripts/script-manager.js database init
node scripts/script-manager.js user activate-super-admin
node scripts/script-manager.js api test-backend
```

### 2. 直接执行脚本

```bash
# 数据库初始化
node scripts/database/init-database.js

# 激活超级管理员
node scripts/utils/activate-super-admin.js

# API测试
node scripts/test/test-backend-api.js

# 系统测试
node scripts/test/system-test-suite.js
```

## 📋 脚本分类

### 🔧 数据库脚本

| 脚本 | 描述 | 用法 |
|------|------|------|
| `database/init` | 初始化数据库 | 创建表结构和超级管理员账户 |
| `database/init-sql` | SQL初始化脚本 | SQL格式的数据库初始化 |
| `database/validate` | 验证数据库 | 检查数据库结构和数据完整性 |

### 👥 用户管理脚本

| 脚本 | 描述 | 用法 |
|------|------|------|
| `user/activate-super-admin` | 激活超级管理员 | 激活或创建超级管理员账户 |
| `user/super-admin-manager` | 超级管理员管理 | 完整的超级管理员账户管理工具 |

### 🌐 API测试脚本

| 脚本 | 描述 | 用法 |
|------|------|------|
| `api/test-backend` | 后端API测试 | 测试所有API端点和响应 |
| `api/check-player-tasks` | 检查玩家任务 | 诊断玩家任务数据显示问题 |

### 🧪 测试套件

| 脚本 | 描述 | 用法 |
|------|------|------|
| `test/system` | 系统测试套件 | 完整的系统功能测试 |
| `test/task-lifecycle` | 任务生命周期测试 | 测试任务的完整生命周期 |

## ⚙️ 配置说明

### 统一配置文件 (`config/config.js`)

```javascript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3003/api',  // 后端API地址
  TIMEOUT: 30000,                         // 请求超时时间
  HEADERS: {
    'Content-Type': 'application/json'
  }
};

export const TEST_USERS = {
  PLAYER: {
    username: 'player1',
    password: 'admin123',
    role: 'player'
  },
  SUPER_ADMIN: {
    username: 'super_admin',
    password: 'admin123',
    role: 'super_admin'
  }
  // ... 其他用户
};
```

### 数据库配置 (`utils/config/database.js`)

```javascript
export const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'dispatch_system',
  timezone: '+08:00',
  // ... 其他配置
});
```

## 🔧 工具库功能

### 统一工具库 (`utils/tools.js`)

提供以下功能：

- **日志系统**: 分级日志输出（error、warn、info、debug）
- **API客户端**: 统一的HTTP请求处理
- **格式化工具**: 日期、货币、持续时间格式化
- **测试工具**: 重试机制、延迟函数、进度条
- **验证工具**: 邮箱、手机号、数字验证
- **数据生成**: 随机测试数据生成
- **测试统计**: 测试结果统计和报告

### 使用示例

```javascript
import { logger, apiClient, formatDate, retry } from './utils/tools.js';

// 日志输出
logger.info('信息消息');
logger.success('成功消息');
logger.error('错误消息');

// API请求
const client = new ApiClient();
const response = await client.get('/tasks');

// 格式化时间
const formatted = formatDate(new Date());

// 重试机制
await retry(async () => {
  // 可能失败的操作
}, 3, 1000);
```

## 📊 测试流程

### 1. 快速测试

```bash
node scripts/script-manager.js quick
```

包含以下测试：
- 数据库验证
- API测试
- 超级管理员检查

### 2. 完整测试

```bash
node scripts/script-manager.js full
```

包含以下测试：
- 数据库初始化
- 超级管理员激活
- 数据库验证
- API测试
- 玩家任务检查
- 系统测试套件
- 任务生命周期测试

### 3. 单独测试

根据需要执行特定脚本进行针对性测试。

## 🐛 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库配置是否正确
   - 确认数据库用户权限

2. **API请求失败**
   - 检查后端服务是否运行
   - 验证API地址和端口
   - 确认网络连接正常

3. **脚本执行失败**
   - 检查Node.js版本兼容性
   - 确认依赖包已安装
   - 查看详细错误日志

### 调试技巧

1. **启用详细日志**
   ```javascript
   // 在脚本中设置日志级别
   LOG_CONFIG.CURRENT_LEVEL = 3; // DEBUG级别
   ```

2. **使用数据库验证脚本**
   ```bash
   node scripts/script-manager.js database validate
   ```

3. **检查API响应**
   ```bash
   node scripts/script-manager.js api test-backend
   ```

## 📝 开发指南

### 添加新脚本

1. **创建脚本文件**
   ```bash
   # 在相应目录创建新脚本
   touch scripts/test/new-test.js
   ```

2. **使用统一工具库**
   ```javascript
   #!/usr/bin/env node
   
   import { logger, apiClient, TEST_USERS } from '../utils/tools.js';
   
   async function main() {
     logger.info('开始新测试...');
     // 测试逻辑
   }
   
   main().catch(console.error);
   ```

3. **注册到脚本管理器**
   ```javascript
   // 在 script-manager.js 中添加
   this.scripts.test['new-test'] = {
     name: '新测试',
     file: 'test/new-test.js',
     description: '新测试的描述'
   };
   ```

### 最佳实践

1. **使用统一的配置和工具**
   - 所有脚本使用统一的配置文件
   - 使用统一的日志系统和工具库
   - 遵循一致的错误处理模式

2. **添加适当的错误处理**
   ```javascript
   try {
     // 主要逻辑
   } catch (error) {
     logger.error('操作失败:', error);
     process.exit(1);
   }
   ```

3. **提供清晰的输出**
   - 使用不同级别的日志
   - 提供进度指示
   - 显示结果摘要

4. **支持参数化**
   ```javascript
   const args = process.argv.slice(2);
   const option = args[0] || 'default';
   ```

## 🔍 维护说明

### 定期维护

1. **更新测试数据**
   - 定期更新测试用户信息
   - 调整API端点配置
   - 更新数据库结构定义

2. **添加新功能测试**
   - 为新功能添加测试脚本
   - 更新系统测试套件
   - 维护测试覆盖率

3. **性能优化**
   - 优化数据库查询
   - 改进错误处理
   - 增强日志系统

### 版本兼容性

- **Node.js**: 推荐 18.x 或更高版本
- **MySQL**: 推荐 8.0 或更高版本
- **依赖包**: 定期更新到最新稳定版本

## 📞 支持

如果遇到问题或需要帮助：

1. 查看本文档的故障排除部分
2. 运行相关诊断脚本
3. 检查系统日志和错误信息
4. 确认所有依赖服务正常运行

---

**注意**: 所有脚本都应在开发环境中测试通过后再在生产环境中使用。