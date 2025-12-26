#!/bin/bash

# ============================================
# 刮刮乐彩票娱乐网站 - 一键部署脚本
# ============================================
# 使用方法: bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/install.sh)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       🎰 刮刮乐彩票娱乐网站 - 一键部署                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_error() { echo -e "${RED}✖ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_step() { echo -e "${CYAN}▶ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# 生成随机字符串
generate_random() {
    local length=${1:-32}
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

# 检查服务是否运行
check_service_running() {
    docker compose ps --status running 2>/dev/null | grep -q "lottery" && return 0 || return 1
}

# 等待服务启动
wait_for_service() {
    local max_attempts=${1:-30}
    local attempt=1
    echo ""
    print_step "等待服务启动..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:5678/health > /dev/null 2>&1; then
            print_success "服务启动成功"
            return 0
        fi
        printf "  尝试 %d/%d...\r" $attempt $max_attempts
        sleep 2
        attempt=$((attempt + 1))
    done
    print_warning "服务可能还在启动中，请稍后检查"
    return 1
}

print_header

# ============================================
# 检查 Docker 环境
# ============================================
print_step "检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    echo "  请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    print_error "Docker Compose 未安装"
    exit 1
fi
print_success "Docker 环境检查通过"
echo ""

# ============================================
# 设置安装目录
# ============================================
INSTALL_DIR="${INSTALL_DIR:-$HOME/lottery}"

# ============================================
# 检测是否已安装
# ============================================
if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    echo -e "${YELLOW}检测到已有安装: $INSTALL_DIR${NC}"
    echo ""
    echo "请选择操作:"
    echo "  1) 更新镜像 - 拉取最新镜像并重启（保留数据和配置）"
    echo "  2) 重新部署 - 删除现有安装，重新配置部署"
    echo "  3) 仅重启服务"
    echo "  4) 查看服务状态"
    echo "  5) 退出"
    echo ""
    read -p "请输入选项 [1-5]: " existing_action

    case "$existing_action" in
        1)
            # 更新镜像
            cd "$INSTALL_DIR"
            echo ""
            print_step "拉取最新镜像..."
            docker compose pull
            echo ""
            print_step "重启服务..."
            docker compose up -d
            wait_for_service
            echo ""
            print_success "更新完成！"
            echo "访问地址: http://localhost:5678"
            exit 0
            ;;
        2)
            # 重新部署 - 继续执行后面的安装流程
            echo ""
            print_warning "将删除现有安装并重新部署"
            read -p "确定要继续吗？(y/N): " confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                echo "已取消"
                exit 0
            fi
            cd "$INSTALL_DIR"
            docker compose down -v 2>/dev/null || true
            cd ~
            rm -rf "$INSTALL_DIR"
            ;;
        3)
            # 重启服务
            cd "$INSTALL_DIR"
            echo ""
            print_step "重启服务..."
            docker compose restart
            wait_for_service
            exit 0
            ;;
        4)
            # 查看状态
            cd "$INSTALL_DIR"
            echo ""
            docker compose ps
            echo ""
            docker compose logs --tail=20
            exit 0
            ;;
        5|*)
            echo "已退出"
            exit 0
            ;;
    esac
fi

# ============================================
# 新安装流程
# ============================================
echo -e "${BLUE}请选择部署模式:${NC}"
echo "  1) 开发模式 - 模拟登录，无需配置 OAuth（默认）"
echo "  2) 生产模式 - 需要配置 Linux.do OAuth"
echo ""
read -p "请输入选项 [1/2]: " deploy_mode
deploy_mode=${deploy_mode:-1}

# 设置安装目录
echo ""
read -p "安装目录 [$INSTALL_DIR]: " input_dir
INSTALL_DIR=${input_dir:-$INSTALL_DIR}
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
print_success "安装目录: $INSTALL_DIR"

# ============================================
# 自动生成通用配置
# ============================================
echo ""
print_step "生成安全配置..."

DB_USER="postgres"
DB_PASSWORD=$(generate_random 16)
DB_NAME="lottery"
JWT_SECRET=$(generate_random 64)
ENCRYPTION_KEY=$(generate_random 32)
REDIS_PASSWORD=$(generate_random 16)

print_success "数据库密码: $DB_PASSWORD"
print_success "Redis 密码: $REDIS_PASSWORD"
print_success "JWT 密钥: 已自动生成"

if [ "$deploy_mode" = "2" ]; then
    # ============================================
    # 生产模式 - 配置 OAuth
    # ============================================
    echo ""
    echo -e "${BLUE}=== Linux.do OAuth 配置 ===${NC}"
    echo -e "${YELLOW}请在 https://connect.linux.do 创建 OAuth 应用${NC}"
    echo ""

    read -p "Client ID: " LINUXDO_CLIENT_ID
    while [ -z "$LINUXDO_CLIENT_ID" ]; do
        print_error "Client ID 不能为空"
        read -p "Client ID: " LINUXDO_CLIENT_ID
    done

    read -s -p "Client Secret: " LINUXDO_SECRET
    echo ""
    while [ -z "$LINUXDO_SECRET" ]; do
        print_error "Client Secret 不能为空"
        read -s -p "Client Secret: " LINUXDO_SECRET
        echo ""
    done

    read -p "您的域名或IP (如 lottery.example.com 或 1.2.3.4): " DOMAIN
    while [ -z "$DOMAIN" ]; do
        print_error "域名/IP 不能为空"
        read -p "您的域名或IP: " DOMAIN
    done

    # 构建回调 URL
    if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        LINUXDO_CALLBACK_URL="http://$DOMAIN:5678/oauth/callback"
        ACCESS_URL="http://$DOMAIN:5678"
    else
        LINUXDO_CALLBACK_URL="https://$DOMAIN/oauth/callback"
        ACCESS_URL="https://$DOMAIN"
    fi

    OAUTH_MODE="prod"
    echo ""
    print_info "回调地址: $LINUXDO_CALLBACK_URL"
else
    # ============================================
    # 开发模式
    # ============================================
    OAUTH_MODE="dev"
    LINUXDO_CLIENT_ID=""
    LINUXDO_SECRET=""
    LINUXDO_CALLBACK_URL=""
    ACCESS_URL="http://localhost:5678"
fi

# ============================================
# 创建 .env 配置文件
# ============================================
echo ""
print_step "创建配置文件..."

cat > .env << EOF
# ============================================
# 刮刮乐彩票娱乐网站 - 环境配置
# ============================================
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 部署模式: $([ "$deploy_mode" = "2" ] && echo "生产模式" || echo "开发模式")

# 数据库配置
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT 配置
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRY=60
JWT_REFRESH_EXPIRY=30

# OAuth 配置
OAUTH_MODE=$OAUTH_MODE
LINUXDO_CLIENT_ID=$LINUXDO_CLIENT_ID
LINUXDO_SECRET=$LINUXDO_SECRET
LINUXDO_CALLBACK_URL=$LINUXDO_CALLBACK_URL

# Redis 配置
REDIS_PASSWORD=$REDIS_PASSWORD

# 加密配置
ENCRYPTION_KEY=$ENCRYPTION_KEY

# 支付配置（暂未启用）
PAYMENT_ENABLED=false
EOF

chmod 600 .env
print_success "配置文件已保存到 .env"

# ============================================
# 下载 docker-compose.yml
# ============================================
echo ""
print_step "下载 Docker Compose 配置..."
curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/docker-compose.yml -o docker-compose.yml
print_success "配置文件下载完成"

# ============================================
# 启动服务
# ============================================
echo ""
print_step "拉取 Docker 镜像..."
docker compose pull

echo ""
print_step "启动服务..."
docker compose up -d

wait_for_service

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    🎉 部署完成！                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "访问地址: $ACCESS_URL"
echo ""

if [ "$deploy_mode" = "2" ]; then
    echo -e "${YELLOW}重要提示:${NC}"
    echo "  请在 Linux.do OAuth 应用中设置回调地址:"
    echo "  $LINUXDO_CALLBACK_URL"
    echo ""
else
    echo "登录方式: 开发模式（模拟登录）"
    echo ""
fi

echo -e "${BLUE}数据库信息:${NC}"
echo "  用户名: $DB_USER"
echo "  密码: $DB_PASSWORD"
echo "  数据库: $DB_NAME"
echo ""

echo -e "${BLUE}常用命令:${NC}"
echo "  cd $INSTALL_DIR"
echo "  docker compose logs -f    # 查看日志"
echo "  docker compose down       # 停止服务"
echo "  docker compose restart    # 重启服务"
echo ""

echo -e "${BLUE}更新/管理:${NC}"
echo "  重新运行此脚本即可更新或管理服务"
echo ""

echo -e "${BLUE}卸载:${NC}"
echo "  bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/uninstall.sh)"
echo ""

# 保存安装信息
cat > .install_info << EOF
INSTALL_DATE=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOY_MODE=$deploy_mode
ACCESS_URL=$ACCESS_URL
EOF
