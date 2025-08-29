#!/bin/bash

# PlayManager V2 部署脚本
# 使用方法: bash deploy.sh

set -e  # 遇到错误就停止

echo "🚀 开始部署 PlayManager V2..."

# 创建日志目录
mkdir -p logs

# 1. 安装依赖
echo "📦 安装后端依赖..."
cd backend
npm ci --only=production
cd ..

echo "📦 安装前端依赖..."
cd frontend
npm ci --only=production

# 2. 构建前端
echo "🔨 构建前端应用..."
npm run build

cd ..

# 3. 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装，正在安装..."
    npm install -g pm2
fi

# 4. 停止现有进程
echo "🛑 停止现有 PM2 进程..."
pm2 stop ecosystem.config.js || echo "没有找到运行中的进程"

# 5. 启动新进程
echo "🚀 启动应用..."
pm2 start ecosystem.config.js --env production

# 6. 保存 PM2 进程列表
echo "💾 保存 PM2 配置..."
pm2 save
pm2 startup

# 7. 显示状态
echo "📊 显示应用状态..."
pm2 status
pm2 logs --lines 20

echo "✅ 部署完成！"
echo "🌐 前端地址: http://103.121.95.222:3000"
echo "🔌 后端地址: http://103.121.95.222:3001"
echo "🩺 健康检查: http://103.121.95.222:3001/health"

echo ""
echo "📋 常用 PM2 命令:"
echo "  pm2 status                 # 查看进程状态"
echo "  pm2 logs                   # 查看日志"
echo "  pm2 restart all            # 重启所有进程"
echo "  pm2 stop all               # 停止所有进程"
echo "  pm2 reload ecosystem.config.js  # 重新加载配置"