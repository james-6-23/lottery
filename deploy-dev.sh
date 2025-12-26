#!/bin/bash

# 刮刮乐彩票娱乐网站 - 开发环境一键部署脚本
# 使用方法: chmod +x deploy-dev.sh && ./deploy-dev.sh

set -e

echo "=========================================="
echo "  刮刮乐彩票娱乐网站 - 开发环境部署"
echo "=========================================="

# 生成随机 JWT 密钥
JWT_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo ""
echo "📝 生成配置文件..."

# 创建 .env 文件
cat > .env << EOF
# 刮刮乐彩票娱乐网站 - 开发环境配置
# 自动生成于 $(date)

# ===================
# 数据库设置
# ===================
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=scratch_lottery

# ===================
# JWT 设置
# ===================
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRY=60
JWT_REFRESH_EXPIRY=30

# ===================
# OAuth 设置 (开发模式 - 模拟登录)
# ===================
OAUTH_MODE=dev
LINUXDO_CLIENT_ID=
LINUXDO_SECRET=
LINUXDO_CALLBACK_URL=

# ===================
# Redis 设置
# ===================
REDIS_PASSWORD=

# ===================
# 支付设置 (关闭)
# ===================
PAYMENT_ENABLED=false
EPAY_MERCHANT_ID=
EPAY_SECRET=
EPAY_CALLBACK_URL=

# ===================
# 加密设置
# ===================
ENCRYPTION_KEY=${ENCRYPTION_KEY}
EOF

echo "✅ 配置文件已生成"

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
echo "🐳 启动 Docker 容器..."

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
sleep 10

# 检查服务状态
echo ""
echo "🔍 检查服务状态..."

if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常运行"
else
    echo "⚠️  后端服务可能还在启动中，请稍后检查"
fi

if curl -s http://localhost > /dev/null 2>&1; then
    echo "✅ 前端服务正常运行"
else
    echo "⚠️  前端服务可能还在启动中，请稍后检查"
fi

echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端：http://localhost"
echo "  后端：http://localhost:8080"
echo "  健康检查：http://localhost:8080/health"
echo ""
echo "登录方式：开发模式模拟登录（无需 OAuth2）"
echo ""
echo "常用命令："
echo "  查看日志：docker compose -f docker-compose.dev.yml logs -f"
echo "  停止服务：docker compose -f docker-compose.dev.yml down"
echo "  重启服务：docker compose -f docker-compose.dev.yml restart"
echo ""
