# 🚀 生产环境部署指南

## 问题诊断
基于控制台错误，主要问题：
1. 前端 API 配置指向 localhost
2. CORS 跨域配置缺少服务器域名
3. HTTP 安全警告

## 部署步骤

### 1. 后端部署
```bash
# 确保后端 .env 配置正确
PORT=3003
ALLOWED_ORIGINS=http://localhost:3000,http://103.121.95.222:3000,http://103.121.95.222

# 重启后端服务
cd backend
npm install --production
npm start
```

### 2. 前端部署
```bash
cd frontend

# 生产环境构建
npm run build

# 启动生产服务器
npm start
```

### 3. 环境变量配置

**前端 .env.production:**
```env
NEXT_PUBLIC_API_URL=http://103.121.95.222:3003/api
NODE_ENV=production
```

**后端 .env:**
```env
PORT=3003
ALLOWED_ORIGINS=http://localhost:3000,http://103.121.95.222:3000,http://103.121.95.222
```

### 4. 网络配置检查
```bash
# 检查端口是否开放
telnet 103.121.95.222 3003

# 检查服务状态
curl http://103.121.95.222:3003/health
```

### 5. HTTPS 配置（推荐）
建议配置反向代理（如 Nginx）启用 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3003/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 故障排除

### CORS 错误
- 确保 `ALLOWED_ORIGINS` 包含前端域名
- 检查端口是否正确
- 重启后端服务

### 网络错误
- 检查防火墙设置
- 确认端口 3003 和 3000 已开放
- 验证服务器 IP 地址

### 安全警告
- 部署 HTTPS 证书
- 使用反向代理
- 配置安全头信息

## 验证部署
1. 访问 `http://103.121.95.222:3003/health` 检查后端
2. 访问 `http://103.121.95.222:3000` 检查前端
3. 尝试登录功能验证 API 连接