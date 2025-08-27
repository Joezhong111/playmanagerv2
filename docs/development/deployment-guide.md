# 部署指南

## 🚀 部署概述

本指南介绍陪玩管理系统的部署流程，包括开发环境、测试环境和生产环境的部署方案。

## 📋 部署架构

### 系统架构图
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              负载均衡层                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           Nginx                                        │ │
│  │  • 负载均衡                    │ • SSL终端                   │ │
│  │  • 静态文件服务                │ • 请求路由                  │ │
│  │  • 缓存                       │ • 安全防护                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│            应用层                      │ │            数据层                      │
│  ┌─────────────────────────────────┐   │ │  ┌─────────────────────────────────┐   │
│  │       Node.js Cluster          │   │ │  │         MySQL Master           │   │
│  │  • PM2 进程管理                │   │ │  │  • 主数据库                    │   │
│  │  • 自动重启                    │   │ │  │  • 写操作                      │   │
│  │  • 日志管理                    │   │ │  │  • 数据备份                    │   │
│  └─────────────────────────────────┘   │ │  └─────────────────────────────────┘   │
│                                       │ │                                       │
│  ┌─────────────────────────────────┐   │ │  ┌─────────────────────────────────┐   │
│  │          Redis Cluster          │   │ │  │         MySQL Slaves           │   │
│  │  • 会话存储                    │   │ │  │  • 读操作                      │   │
│  │  • 缓存                        │   │ │  │  • 负载均衡                    │   │
│  │  • 消息队列                    │   │ │  │  • 高可用                      │   │
│  └─────────────────────────────────┘   │ │  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘ └─────────────────────────────────────────┘
```

### 环境配置

#### 开发环境
- 单机部署
- 热重载支持
- 详细日志输出
- 调试工具

#### 测试环境
- 模拟生产配置
- 自动化测试
- 性能监控
- 错误追踪

#### 生产环境
- 高可用部署
- 负载均衡
- 数据备份
- 安全防护

## 🛠️ 环境准备

### 服务器要求

#### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 50GB SSD
- **网络**: 10Mbps
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 8+

#### 推荐配置
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 100GB SSD
- **网络**: 100Mbps
- **操作系统**: Ubuntu 22.04 LTS

### 软件依赖

#### 系统软件
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
  curl \
  wget \
  git \
  nginx \
  nodejs \
  npm \
  mysql-server \
  redis-server

# CentOS/RHEL
sudo yum update -y
sudo yum install -y \
  curl \
  wget \
  git \
  nginx \
  nodejs \
  npm \
  mysql-server \
  redis
```

#### Node.js版本
```bash
# 使用NVM安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18
```

## 🐳 Docker部署

### Dockerfile (后端)
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 切换用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

### Dockerfile (前端)
```dockerfile
# frontend-react/Dockerfile
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM nginx:alpine

# 复制构建文件
COPY --from=build /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=playmanager
      - DB_PASSWORD=your_password
      - DB_DATABASE=playmanager
      - REDIS_HOST=redis
      - JWT_SECRET=your_jwt_secret
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend-react
    ports:
      - "5173:80"
    environment:
      - VITE_API_BASE_URL=https://api.yourdomain.com
      - VITE_WS_URL=wss://api.yourdomain.com
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=playmanager
      - MYSQL_USER=playmanager
      - MYSQL_PASSWORD=your_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

## 📦 传统部署

### 1. 服务器初始化

#### 创建应用用户
```bash
# 创建应用用户
sudo useradd -m -s /bin/bash playmanager
sudo usermod -aG sudo playmanager

# 切换到应用用户
sudo su - playmanager
```

#### 安装Node.js
```bash
# 下载并安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 数据库配置

#### MySQL安装
```bash
# 安装MySQL
sudo apt update
sudo apt install mysql-server

# 安全配置
sudo mysql_secure_installation

# 创建数据库和用户
mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE playmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'playmanager'@'localhost' IDENTIFIED BY 'your_password';

-- 授权用户
GRANT ALL PRIVILEGES ON playmanager.* TO 'playmanager'@'localhost';
FLUSH PRIVILEGES;

-- 退出MySQL
EXIT;
```

#### Redis安装
```bash
# 安装Redis
sudo apt install redis-server

# 配置Redis
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# 编辑配置
sudo nano /etc/redis/redis.conf
```

#### Redis配置
```ini
# /etc/redis/redis.conf
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. 应用部署

#### 后端部署
```bash
# 克隆代码
git clone <repository-url> playmanager
cd playmanager/backend

# 安装依赖
npm install

# 构建应用
npm run build

# 创建环境变量文件
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=playmanager
DB_PASSWORD=your_password
DB_DATABASE=playmanager
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_key_here
LOG_LEVEL=info
EOF

# 初始化数据库
mysql -u playmanager -p playmanager < ../scripts/init-db.sql

# 启动应用
pm2 start server.js --name "playmanager-backend"
```

#### 前端部署
```bash
# 进入前端目录
cd ../frontend-react

# 安装依赖
npm install

# 构建应用
npm run build

# 配置环境变量
cat > .env.production << EOF
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_APP_TITLE=陪玩管理系统
EOF

# 使用serve启动静态文件
npm install -g serve
pm2 start serve --name "playmanager-frontend" -- --single -s build -l 5173
```

### 4. Nginx配置

#### 安装Nginx
```bash
# 安装Nginx
sudo apt install nginx

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Nginx配置文件
```nginx
# /etc/nginx/sites-available/playmanager
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # 现代加密套件
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 前端应用
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 启用gzip压缩
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### 启用配置
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/playmanager /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载Nginx
sudo systemctl reload nginx
```

## 🔧 PM2进程管理

### PM2配置文件
```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'playmanager-backend',
      script: 'server.js',
      cwd: '/home/playmanager/playmanager/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_USER: 'playmanager',
        DB_PASSWORD: 'your_password',
        DB_DATABASE: 'playmanager',
        REDIS_HOST: 'localhost',
        JWT_SECRET: 'your_jwt_secret'
      },
      log_file: '/var/log/pm2/playmanager-backend.log',
      out_file: '/var/log/pm2/playmanager-backend-out.log',
      error_file: '/var/log/pm2/playmanager-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s'
    },
    {
      name: 'playmanager-frontend',
      script: 'serve',
      cwd: '/home/playmanager/playmanager/frontend-react',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      args: '--single -s build -l 5173',
      log_file: '/var/log/pm2/playmanager-frontend.log',
      out_file: '/var/log/pm2/playmanager-frontend-out.log',
      error_file: '/var/log/pm2/playmanager-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

### PM2命令
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看进程状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart playmanager-backend
pm2 restart playmanager-frontend

# 停止应用
pm2 stop playmanager-backend
pm2 stop playmanager-frontend

# 删除应用
pm2 delete playmanager-backend
pm2 delete playmanager-frontend

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🔒 安全配置

### 防火墙配置
```bash
# 安装UFW
sudo apt install ufw

# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### SSL证书配置

#### Let's Encrypt免费证书
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

#### 自签名证书（开发环境）
```bash
# 生成私钥
openssl genrsa -out server.key 2048

# 生成证书签名请求
openssl req -new -key server.key -out server.csr

# 生成自签名证书
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# 创建DH参数
openssl dhparam -out dhparam.pem 2048
```

### 系统安全加固

#### SSH安全
```bash
# 编辑SSH配置
sudo nano /etc/ssh/sshd_config

# 修改以下配置
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 60
```

#### 系统更新
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📊 监控和日志

### 应用监控

#### PM2监控
```bash
# 安装PM2监控面板
pm2 install pm2-web

# 启动监控
pm2-web

# 访问 http://localhost:9615
```

#### 健康检查端点
```javascript
// backend/routes/health.js
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export const healthCheck = async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown'
    }
  };

  // 检查数据库连接
  try {
    await pool.execute('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  // 检查Redis连接
  try {
    const redis = require('../config/redis');
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  // 检查内存使用
  const used = process.memoryUsage();
  const total = require('os').totalmem();
  const memoryPercent = (used.rss / total) * 100;
  
  health.checks.memory = memoryPercent > 90 ? 'critical' : 'ok';
  
  if (health.checks.memory === 'critical') {
    health.status = 'critical';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
};
```

### 日志管理

#### 日志轮转配置
```bash
# 创建logrotate配置
sudo nano /etc/logrotate.d/playmanager
```

```conf
# /etc/logrotate.d/playmanager
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 playmanager playmanager
    postrotate
        pm2 reload playmanager-backend
        pm2 reload playmanager-frontend
    endscript
}
```

#### 结构化日志
```javascript
// backend/utils/logger.js
import winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'playmanager-api' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m'
    })
  ]
});

export default logger;
```

## 🔄 部署脚本

### 自动部署脚本
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# 配置变量
PROJECT_NAME="playmanager"
DEPLOY_USER="playmanager"
DEPLOY_PATH="/home/$DEPLOY_USER/$PROJECT_NAME"
BACKUP_PATH="/home/$DEPLOY_USER/backups"
REPO_URL="https://github.com/yourusername/playmanager.git"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
    error "请不要使用root用户运行此脚本"
    exit 1
fi

# 创建备份目录
log "创建备份目录..."
mkdir -p $BACKUP_PATH

# 备份数据库
log "备份数据库..."
mysqldump -u playmanager -p playmanager > $BACKUP_PATH/mysql_backup_$(date +%Y%m%d_%H%M%S).sql

# 停止服务
log "停止PM2服务..."
pm2 stop $PROJECT_NAME-backend || true
pm2 stop $PROJECT_NAME-frontend || true

# 备份现有代码
if [[ -d $DEPLOY_PATH ]]; then
    log "备份现有代码..."
    mv $DEPLOY_PATH $BACKUP_PATH/$PROJECT_NAME_$(date +%Y%m%d_%H%M%S)
fi

# 克隆新代码
log "克隆新代码..."
git clone $REPO_URL $DEPLOY_PATH
cd $DEPLOY_PATH

# 安装依赖
log "安装后端依赖..."
cd backend
npm install --production

log "安装前端依赖..."
cd ../frontend-react
npm install --production

# 构建应用
log "构建前端应用..."
npm run build

# 启动服务
log "启动PM2服务..."
cd ../backend
pm2 start server.js --name "$PROJECT_NAME-backend"

cd ../frontend-react
pm2 start serve --name "$PROJECT_NAME-frontend" -- --single -s build -l 5173

# 保存PM2配置
pm2 save

# 清理旧备份
log "清理超过7天的备份..."
find $BACKUP_PATH -type d -name "$PROJECT_NAME_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_PATH -name "mysql_backup_*.sql" -mtime +7 -delete

log "部署完成！"
pm2 status
```

### 回滚脚本
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

# 配置变量
PROJECT_NAME="playmanager"
DEPLOY_USER="playmanager"
DEPLOY_PATH="/home/$DEPLOY_USER/$PROJECT_NAME"
BACKUP_PATH="/home/$DEPLOY_USER/backups"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 查找最新备份
latest_backup=$(ls -td $BACKUP_PATH/${PROJECT_NAME}_* | head -1)

if [[ -z $latest_backup ]]; then
    error "未找到备份文件"
    exit 1
fi

log "找到最新备份: $latest_backup"

# 停止服务
log "停止服务..."
pm2 stop $PROJECT_NAME-backend || true
pm2 stop $PROJECT_NAME-frontend || true

# 恢复代码
log "恢复代码..."
rm -rf $DEPLOY_PATH
cp -r $latest_backup $DEPLOY_PATH

# 启动服务
log "启动服务..."
cd $DEPLOY_PATH/backend
pm2 start server.js --name "$PROJECT_NAME-backend"

cd $DEPLOY_PATH/frontend-react
pm2 start serve --name "$PROJECT_NAME-frontend" -- --single -s build -l 5173

log "回滚完成！"
pm2 status
```

## 🎯 性能优化

### Nginx优化
```nginx
# /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    # 基础设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 缓存配置
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Node.js优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 系统内核优化
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_syncookies = 1" | sudo tee -a /etc/sysctl.conf

# 应用内核优化
sudo sysctl -p
```

### 数据库优化
```sql
-- MySQL配置优化
SET GLOBAL innodb_buffer_pool_size = 1G;
SET GLOBAL innodb_log_file_size = 256M;
SET GLOBAL innodb_log_buffer_size = 16M;
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL innodb_flush_method = O_DIRECT;
SET GLOBAL innodb_file_per_table = 1;
SET GLOBAL innodb_buffer_pool_instances = 2;
SET GLOBAL query_cache_size = 0;
SET GLOBAL query_cache_type = 0;
```

## 🚨 故障排除

### 常见问题

#### 1. 应用无法启动
```bash
# 检查端口占用
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5173

# 检查PM2状态
pm2 status
pm2 logs

# 检查系统资源
htop
df -h
```

#### 2. 数据库连接失败
```bash
# 检查MySQL状态
sudo systemctl status mysql

# 检查连接
mysql -u playmanager -p -h localhost playmanager

# 检查防火墙
sudo ufw status
```

#### 3. Nginx配置错误
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重新加载配置
sudo systemctl reload nginx
```

#### 4. SSL证书问题
```bash
# 检查证书状态
sudo certbot certificates

# 强制更新证书
sudo certbot renew --force-renewal

# 检查证书链
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 日志分析
```bash
# 查看应用日志
pm2 logs playmanager-backend --lines 100
pm2 logs playmanager-frontend --lines 100

# 查看系统日志
sudo journalctl -u nginx -f
sudo journalctl -u mysql -f

# 查看认证日志
sudo journalctl -u sshd -f
```

---

*本文档提供了陪玩管理系统的完整部署指南，包括环境准备、应用部署、安全配置和故障排除。*

**最后更新**: 2025-08-26  
**文档版本**: v1.0  
**负责人**: 运维团队