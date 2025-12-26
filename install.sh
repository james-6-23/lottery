#!/bin/bash

# 刮刮乐彩票娱乐网站 - 一键部署脚本
# 使用方法: bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/install.sh)

set -e

echo "=========================================="
echo "  🎰 刮刮乐彩票娱乐网站 - 一键部署"
echo "=========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   安装文档: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 创建目录
INSTALL_DIR="${INSTALL_DIR:-$HOME/lottery}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "📁 安装目录: $INSTALL_DIR"
echo ""

# 下载 docker-compose.yml
echo "📥 下载配置文件..."
curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/docker-compose.dev.yml -o docker-compose.yml

# 停止旧容器（如果存在）
echo ""
echo "🐳 启动服务..."
docker compose down 2>/dev/null || true
docker compose pull
docker compose up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if curl -s http://localhost:5678/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功"
else
    echo "⚠️  服务可能还在启动中，请稍后检查"
fi

echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://localhost:5678"
echo ""
echo "常用命令:"
echo "  cd $INSTALL_DIR"
echo "  docker compose logs -f    # 查看日志"
echo "  docker compose down       # 停止服务"
echo "  docker compose pull       # 更新镜像"
echo "  docker compose up -d      # 启动服务"
echo ""
