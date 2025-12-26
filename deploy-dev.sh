#!/bin/bash

# 刮刮乐彩票娱乐网站 - 开发环境一键部署脚本
# 使用方法: chmod +x deploy-dev.sh && ./deploy-dev.sh

set -e

echo "=========================================="
echo "  刮刮乐彩票娱乐网站 - 开发环境部署"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo ""
echo "🐳 构建并启动 Docker 容器..."

# 使用 docker compose 或 docker-compose
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker compose -f docker-compose.dev.yml up -d --build
else
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml up -d --build
fi

echo ""
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo ""
echo "🔍 检查服务状态..."

if curl -s http://localhost:5678/health > /dev/null 2>&1; then
    echo "✅ 服务正常运行"
else
    echo "⚠️  服务可能还在启动中，请稍后检查"
fi

echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "访问地址：http://localhost:5678"
echo "健康检查：http://localhost:5678/health"
echo ""
echo "登录方式：开发模式模拟登录（无需 OAuth2）"
echo ""
echo "常用命令："
echo "  查看日志：docker compose -f docker-compose.dev.yml logs -f"
echo "  停止服务：docker compose -f docker-compose.dev.yml down"
echo "  重启服务：docker compose -f docker-compose.dev.yml restart"
echo ""
