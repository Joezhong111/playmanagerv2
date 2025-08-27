# 后端 API 文档

本文档为前端开发人员提供了与 PlayManagerV2 后端系统集成的详细指南。

## 基础信息

- **基础 URL**: 所有 API 的基础路径为 `/api`。例如, 登录接口的完整路径是 `http://<your-domain>/api/auth/login`。
- **认证**: 大多数接口需要通过 `Authorization` 请求头传递 `Bearer Token` 进行认证。
- **Content-Type**: 所有 `POST` 和 `PUT` 请求的请求体都应使用 `application/json` 格式。

## 标准响应格式

所有成功响应都遵循以下格式：
```json
{
  "success": true,
  "message": "操作描述信息（可选）",
  "data": { /* 响应数据 */ }
}
```

所有错误响应都遵循以下格式：
```json
{
  "success": false,
  "message": "错误描述信息",
  "code": "ERROR_CODE",
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

---

## 系统设置 (Setup)

系统初始化和配置相关接口，用于数据库初始化和状态检查。

### 1. 初始化数据库

- **路径**: `/setup/init`
- **方法**: `POST`
- **描述**: 初始化数据库表结构和测试数据，包括创建用户表、任务表、任务日志表，以及插入默认测试用户和任务。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "数据库初始化完成",
    "data": {
      "userCount": 4,
      "taskCount": 2
    }
  }
  ```
- **错误响应**:
  - `500 Internal Server Error`: 数据库初始化失败。

### 2. 检查系统状态

- **路径**: `/setup/status`
- **方法**: `GET`
- **描述**: 检查数据库初始化状态和数据统计。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "initialized": true,
    "tables": ["users", "tasks", "task_logs"],
    "data": {
      "userCount": 4,
      "taskCount": 2
    }
  }
  ```

### 3. 时间测试

- **路径**: `/setup/time-test`
- **方法**: `GET`
- **描述**: 测试数据库和系统时间，用于时区配置验证。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "database_now": "2023-12-01T12:00:00.000Z",
      "javascript": {
        "local_time": "2023-12-01T20:00:00.000Z",
        "utc_time": "Fri, 01 Dec 2023 12:00:00 GMT",
        "timestamp": 1701432000000,
        "timezone_offset": -480
      }
    }
  }
  ```

---

## 认证 (Auth)

认证相关接口，用于用户登录、注册和 Token 验证。

### 1. 用户登录

- **路径**: `/auth/login`
- **方法**: `POST`
- **描述**: 使用用户名和密码进行认证，成功后返回 `token` 和用户信息。
- **请求体**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "your_jwt_token",
      "user": {
        "id": 1,
        "username": "testuser",
        "role": "player"
      }
    }
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 用户名或密码缺失。
  - `401 Unauthorized`: 凭证无效。

### 2. 用户注册

- **路径**: `/auth/register`
- **方法**: `POST`
- **描述**: 创建一个新用户。
- **请求体**:
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "string" // "dispatcher" 或 "player"
  }
  ```
- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "userId": 2,
      "username": "newuser",
      "role": "player"
    }
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 输入验证失败 (例如，密码少于6个字符)。
  - `409 Conflict`: 用户名已存在。

### 3. 验证 Token

- **路径**: `/auth/verify`
- **方法**: `GET`
- **描述**: 验证 `Authorization` 头中的 `Bearer Token` 是否有效，并返回用户信息。
- **请求头**:
  - `Authorization`: `Bearer <token>`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "username": "testuser",
        "role": "player"
      }
    }
  }
  ```
- **错误响应**:
  - `401 Unauthorized`: Token 缺失或无效。

---

## 任务 (Tasks)

任务管理相关接口，包括创建、查询、更新和改变任务状态。

**注意**: 所有任务接口都需要认证。

### 1. 创建任务

- **路径**: `/tasks`
- **方法**: `POST`
- **角色**: `dispatcher`
- **描述**: 创建一个新任务。
- **请求体**:
  ```json
  {
    "customer_name": "string",
    "customer_contact": "string",
    "game_name": "string",
    "game_mode": "string",
    "duration": "integer", // 小时
    "price": "number",
    "requirements": "string", // 可选
    "player_id": "integer" // 可选, 直接指派给某个玩家
  }
  ```
- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": { ...taskObject }
  }
  ```

### 2. 获取任务列表

- **路径**: `/tasks`
- **方法**: `GET`
- **角色**: 任何已认证用户
- **描述**: 获取任务列表。返回的任务根据用户角色有所不同 (派单员看所有，玩家看指派给自己的和未指派的)。
- **查询参数 (可选)**:
  - `status`: `pending`, `accepted`, `in_progress`, `completed`, `cancelled`
  - `player_id`: `integer`
  - `dispatcher_id`: `integer`
  - `page`: `integer`
  - `limit`: `integer`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [ { ...taskObject }, ... ]
  }
  ```

### 3. 获取单个任务

- **路径**: `/tasks/:id`
- **方法**: `GET`
- **角色**: 任何已认证用户
- **描述**: 根据 ID 获取单个任务的详细信息。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": { ...taskObject }
  }
  ```

### 4. 更新任务

- **路径**: `/tasks/:id`
- **方法**: `PUT`
- **角色**: `dispatcher`
- **描述**: 更新任务信息。
- **请求体**: (与创建任务相同，所有字段可选)
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "data": { ...taskObject }
  }
  ```

### 5. 任务状态变更

以下接口用于玩家或派单员改变任务的状态。所有接口方法均为 `PUT`。

| 路径 | 角色 | 描述 |
| :--- | :--- | :--- |
| `/tasks/:id/accept` | `player` | 玩家接受一个任务 |
| `/tasks/:id/start` | `player` | 玩家开始一个任务 |
| `/tasks/:id/complete`| `player` | 玩家完成一个任务 |
| `/tasks/:id/pause` | `player` | 玩家暂停一个任务 |
| `/tasks/:id/resume` | `player` | 玩家恢复一个任务 |
| `/tasks/:id/cancel` | `dispatcher` 或 `player` | 取消一个任务 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task [action] successfully", // [action] 会被替换为具体操作，如 "accepted", "started", "completed" 等
    "data": { ...taskObject } // 返回更新后的任务对象
  }
  ```
  
  具体的成功消息示例：
  - 接受任务: `"Task accepted successfully"`
  - 开始任务: `"Task started successfully"`  
  - 完成任务: `"Task completed successfully"`
  - 暂停任务: `"Task paused successfully"`
  - 恢复任务: `"Task resumed successfully"`
  - 取消任务: `"Task cancelled successfully"`

---

## 用户 (Users)

用户管理相关接口。

**注意**: 所有用户接口都需要认证。

### 1. 获取空闲玩家列表

- **路径**: `/users/players/idle`
- **方法**: `GET`
- **描述**: 获取所有状态为 "idle" 的玩家。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [ { ...userObject }, ... ]
  }
  ```

### 2. 获取所有玩家列表

- **路径**: `/users/players`
- **方法**: `GET`
- **描述**: 获取所有角色为 "player" 的用户。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [ { ...userObject }, ... ]
  }
  ```

### 3. 更新用户状态

- **路径**: `/users/status`
- **方法**: `PUT`
- **描述**: 更新当前登录用户的状态。
- **请求体**:
  ```json
  {
    "status": "string" // 有效值: "idle", "busy"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Status updated successfully",
    "data": {
      "status": "idle"
    }
  }
  ```

### 4. 获取用户个人资料

- **路径**: `/users/profile`
- **方法**: `GET`
- **描述**: 获取当前登录用户的个人资料。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": { ...userObject }
  }
  ```

### 管理员功能

以下接口需要管理员权限（role为"admin"）：

### 5. 获取所有用户

- **路径**: `/users`
- **方法**: `GET`
- **角色**: `admin`
- **描述**: 获取所有用户列表，支持按角色和状态筛选。
- **查询参数 (可选)**:
  - `role`: `dispatcher`, `player`, `admin`
  - `status`: `idle`, `busy`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [ { ...userObject }, ... ]
  }
  ```

### 6. 获取指定用户

- **路径**: `/users/:id`
- **方法**: `GET`
- **角色**: `admin`
- **描述**: 根据ID获取指定用户信息。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": { ...userObject }
  }
  ```

### 7. 更新用户信息

- **路径**: `/users/:id`
- **方法**: `PUT`
- **角色**: `admin`
- **描述**: 更新指定用户的信息，包括密码重置。
- **请求体** (所有字段可选):
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "string",
    "status": "string"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "data": { ...updatedUserObject }
  }
  ```

### 8. 删除用户

- **路径**: `/users/:id`
- **方法**: `DELETE`
- **角色**: `admin`
- **描述**: 删除指定用户。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

---

## 统计 (Stats)

统计数据相关接口。

**注意**: 所有统计接口都需要认证。

### 1. 获取任务统计

- **路径**: `/stats/tasks`
- **方法**: `GET`
- **描述**: 获取任务相关的统计数据。
- **查询参数 (可选)**:
  - `startDate`: `YYYY-MM-DD`
  - `endDate`: `YYYY-MM-DD`
  - `status`: `string`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": { ...taskStatsObject }
  }
  ```

### 2. 获取用户统计

- **路径**: `/stats/users`
- **方法**: `GET`
- **描述**: 获取用户相关的统计数据。
- **查询参数 (可选)**:
  - `role`: `string`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": { ...userStatsObject }
  }
  ```

---

## 系统监控

### 健康检查

- **路径**: `/health`
- **方法**: `GET`
- **描述**: 检查服务器和数据库连接状态。
- **成功响应 (200 OK)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2023-12-01T12:00:00.000Z",
    "database": "connected"
  }
  ```

---

## 数据模型

### 用户对象 (userObject)

```json
{
  "id": 1,
  "username": "testuser",
  "role": "player", // "dispatcher", "player", "admin"
  "status": "idle", // "idle", "busy"
  "created_at": "2023-12-01T12:00:00.000Z",
  "updated_at": "2023-12-01T12:00:00.000Z"
}
```

### 任务对象 (taskObject)

```json
{
  "id": 1,
  "customer_name": "张三",
  "customer_contact": "13800138000",
  "game_name": "王者荣耀",
  "game_mode": "排位赛",
  "duration": 2, // 小时
  "price": 120.00,
  "requirements": "需要带到钻石段位",
  "dispatcher_id": 1,
  "player_id": null, // 可为null
  "status": "pending", // "pending", "accepted", "in_progress", "completed", "cancelled"
  "created_at": "2023-12-01T12:00:00.000Z",
  "accepted_at": null, // 可为null
  "started_at": null, // 可为null
  "completed_at": null // 可为null
}
```

### 错误代码说明

- `VALIDATION_ERROR`: 输入验证失败
- `NOT_FOUND`: 资源未找到
- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `INTERNAL_ERROR`: 服务器内部错误
