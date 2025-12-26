#!/bin/bash

# ============================================
# 刮刮乐彩票娱乐网站 - 卸载脚本
# ============================================
# 使用方法: bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/uninstall.sh)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${RED}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       🗑️  刮刮乐彩票娱乐网站 - 卸载                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_error() { echo -e "${RED}✖ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_step() { echo -e "${BLUE}▶ $1${NC}"; }

print_header

# 默认安装目录
INSTALL_DIR="${INSTALL_DIR:-$HOME/lottery}"

# 检查安装目录
if [ ! -d "$INSTALL_DIR" ]; then
    # 尝试其他常见位置
    if [ -d "/root/lottery" ]; then
        INSTALL_DIR="/root/lottery"
    elif [ -d "$HOME/lottery" ]; then
        INSTALL_DIR="$HOME/lottery"
    else
        print_error "未找到安装目录"
        read -p "请输入安装目录路径: " INSTALL_DIR
        if [ ! -d "$INSTALL_DIR" ]; then
            print_error "目录不存在: $INSTALL_DIR"
            exit 1
        fi
    fi
fi

echo "安装目录: $INSTALL_DIR"
echo ""

# 确认卸载
echo -e "${YELLOW}警告: 此操作将:${NC}"
echo "  1. 停止并删除所有 Docker 容器"
echo "  2. 删除 Docker 数据卷（包括数据库数据）"
echo "  3. 删除安装目录及所有配置文件"
echo ""
read -p "确定要卸载吗? (输入 yes 确认): " confirm

if [ "$confirm" != "yes" ]; then
    echo "已取消卸载"
    exit 0
fi

echo ""

# 停止并删除容器
print_step "停止 Docker 容器..."
cd "$INSTALL_DIR" 2>/dev/null || true

if [ -f "docker-compose.yml" ]; then
    docker compose down -v 2>/dev/null || true
    print_success "容器已停止并删除"
else
    # 尝试通过容器名称停止
    docker stop lottery-app lottery-postgres lottery-redis lottery-dev lottery-dev-postgres lottery-dev-redis 2>/dev/null || true
    docker rm lottery-app lottery-postgres lottery-redis lottery-dev lottery-dev-postgres lottery-dev-redis 2>/dev/null || true
    print_success "容器已清理"
fi

# 删除网络
print_step "清理 Docker 网络..."
docker network rm lottery-net lottery_lottery-net lottery_lottery-dev-net 2>/dev/null || true
print_success "网络已清理"

# 删除数据卷
print_step "删除数据卷..."
docker volume rm lottery_postgres_data lottery_redis_data 2>/dev/null || true
docker volume rm lottery-postgres-data lottery-redis-data 2>/dev/null || true
print_success "数据卷已删除"

# 删除安装目录
print_step "删除安装目录..."
cd ~
rm -rf "$INSTALL_DIR"
print_success "安装目录已删除"

# 可选：删除 Docker 镜像
echo ""
read -p "是否删除 Docker 镜像以释放空间? (y/N): " remove_images
if [ "$remove_images" = "y" ] || [ "$remove_images" = "Y" ]; then
    print_step "删除 Docker 镜像..."
    docker rmi ghcr.io/james-6-23/lottery:latest 2>/dev/null || true
    docker rmi ghcr.io/james-6-23/lottery-dev:latest 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    print_success "镜像已删除"
fi

echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ 卸载完成！                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "感谢使用刮刮乐彩票娱乐网站！"
echo ""
