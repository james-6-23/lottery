#!/bin/bash

# ============================================
# 刮刮乐彩票娱乐网站 - 生产环境一键部署脚本
# ============================================
# 使用方法: chmod +x deploy-prod.sh && ./deploy-prod.sh
# 
# 功能:
#   1. 检查系统环境
#   2. 交互式配置环境变量
#   3. 自动生成安全密钥
#   4. 部署 Docker 容器
#   5. 健康检查

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       🎰 刮刮乐彩票娱乐网站 - 生产环境部署                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✖ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

# 生成随机字符串
generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

# 生成32字节密钥
generate_encryption_key() {
    openssl rand -base64 32 | head -c 32
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 未安装"
        return 1
    fi
    return 0
}

# 检查系统环境
check_environment() {
    print_step "检查系统环境..."
    
    local missing=0
    
    if ! check_command docker; then
        echo "  请安装 Docker: https://docs.docker.com/get-docker/"
        missing=1
    fi
    
    if ! docker compose version &> /dev/null && ! check_command docker-compose; then
        echo "  请安装 Docker Compose"
        missing=1
    fi
    
    if ! check_command openssl; then
        print_warning "openssl 未安装，将使用备用方法生成密钥"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "请先安装缺失的依赖"
        exit 1
    fi
    
    print_success "系统环境检查通过"
}

# 读取用户输入（带默认值）
read_input() {
    local prompt="$1"
    local default="$2"
    local is_secret="$3"
    local result
    
    if [ -n "$default" ]; then
        prompt="$prompt [$default]"
    fi
    
    if [ "$is_secret" = "true" ]; then
        read -s -p "$prompt: " result
        echo ""
    else
        read -p "$prompt: " result
    fi
    
    echo "${result:-$default}"
}

# 配置环境变量
configure_environment() {
    print_step "配置环境变量..."
    echo ""
    
    # 检查是否已有 .env 文件
    if [ -f ".env" ]; then
        echo -e "${YELLOW}检测到已存在 .env 文件${NC}"
        read -p "是否重新配置? (y/N): " reconfigure
        if [ "$reconfigure" != "y" ] && [ "$reconfigure" != "Y" ]; then
            print_success "使用现有配置"
            return
        fi
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_warning "已备份原配置文件"
    fi
    
    echo ""
    echo -e "${BLUE}=== 数据库配置 ===${NC}"
    DB_USER=$(read_input "数据库用户名" "postgres")
    DB_PASSWORD=$(read_input "数据库密码 (留空自动生成)" "")
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(generate_random_string 16)
        echo "  已生成数据库密码: $DB_PASSWORD"
    fi
    DB_NAME=$(read_input "数据库名称" "scratch_lottery")
    
    echo ""
    echo -e "${BLUE}=== JWT 配置 ===${NC}"
    JWT_SECRET=$(read_input "JWT 密钥 (留空自动生成)" "")
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(generate_random_string 64)
        echo "  已生成 JWT 密钥"
    fi
    JWT_ACCESS_EXPIRY=$(read_input "访问令牌过期时间(分钟)" "15")
    JWT_REFRESH_EXPIRY=$(read_input "刷新令牌过期时间(天)" "7")
    
    echo ""
    echo -e "${BLUE}=== Linux.do OAuth 配置 ===${NC}"
    echo "  请在 https://connect.linux.do 申请 OAuth 应用"
    LINUXDO_CLIENT_ID=$(read_input "Client ID" "")
    LINUXDO_SECRET=$(read_input "Client Secret" "" "true")
    DOMAIN=$(read_input "您的域名 (如 lottery.example.com)" "")
    
    if [ -n "$DOMAIN" ]; then
        LINUXDO_CALLBACK_URL="https://$DOMAIN/oauth/callback"
    else
        LINUXDO_CALLBACK_URL=$(read_input "OAuth 回调地址 (必填)" "")
        if [ -z "$LINUXDO_CALLBACK_URL" ]; then
            print_error "OAuth 回调地址不能为空"
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${BLUE}=== Redis 配置 ===${NC}"
    REDIS_PASSWORD=$(read_input "Redis 密码 (留空不设密码)" "")
    
    echo ""
    echo -e "${BLUE}=== 支付配置 (可选) ===${NC}"
    read -p "是否启用支付功能? (y/N): " enable_payment
    if [ "$enable_payment" = "y" ] || [ "$enable_payment" = "Y" ]; then
        PAYMENT_ENABLED="true"
        EPAY_MERCHANT_ID=$(read_input "易支付商户ID" "")
        EPAY_SECRET=$(read_input "易支付密钥" "" "true")
        if [ -n "$DOMAIN" ]; then
            EPAY_CALLBACK_URL="https://$DOMAIN/api/payment/callback"
        else
            EPAY_CALLBACK_URL=$(read_input "支付回调地址" "")
        fi
    else
        PAYMENT_ENABLED="false"
        EPAY_MERCHANT_ID=""
        EPAY_SECRET=""
        EPAY_CALLBACK_URL=""
    fi
    
    echo ""
    echo -e "${BLUE}=== 加密配置 ===${NC}"
    ENCRYPTION_KEY=$(generate_encryption_key)
    echo "  已生成 AES-256 加密密钥"
    
    # 写入 .env 文件
    cat > .env << EOF
# ============================================
# 刮刮乐彩票娱乐网站 - 生产环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# ===================
# Database Settings
# ===================
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# ===================
# JWT Settings
# ===================
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRY=$JWT_ACCESS_EXPIRY
JWT_REFRESH_EXPIRY=$JWT_REFRESH_EXPIRY

# ===================
# OAuth Settings
# ===================
OAUTH_MODE=prod
LINUXDO_CLIENT_ID=$LINUXDO_CLIENT_ID
LINUXDO_SECRET=$LINUXDO_SECRET
LINUXDO_CALLBACK_URL=$LINUXDO_CALLBACK_URL

# ===================
# Redis Settings
# ===================
REDIS_PASSWORD=$REDIS_PASSWORD

# ===================
# Payment Settings
# ===================
PAYMENT_ENABLED=$PAYMENT_ENABLED
EPAY_MERCHANT_ID=$EPAY_MERCHANT_ID
EPAY_SECRET=$EPAY_SECRET
EPAY_CALLBACK_URL=$EPAY_CALLBACK_URL

# ===================
# Encryption Settings
# ===================
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

    chmod 600 .env
    print_success "环境配置已保存到 .env 文件"
}

# 部署服务
deploy_services() {
    print_step "部署 Docker 服务..."
    echo ""
    
    # 选择 docker compose 命令
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # 停止旧服务
    echo "  停止旧服务..."
    $COMPOSE_CMD down 2>/dev/null || true
    
    # 拉取最新镜像
    echo "  拉取最新镜像..."
    $COMPOSE_CMD pull
    
    # 启动服务
    echo "  启动服务..."
    $COMPOSE_CMD up -d
    
    print_success "服务已启动"
}

# 健康检查
health_check() {
    print_step "执行健康检查..."
    echo ""
    
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:5678/health"
    
    echo "  等待服务启动..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$health_url" > /dev/null 2>&1; then
            print_success "服务健康检查通过"
            return 0
        fi
        echo -ne "  尝试 $attempt/$max_attempts...\r"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    print_warning "服务可能还在启动中，请稍后手动检查"
    return 1
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 部署完成！                           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 读取域名
    if [ -f ".env" ]; then
        source .env
        local callback_url="${LINUXDO_CALLBACK_URL:-http://localhost:5678/api/auth/oauth/callback}"
        local domain=$(echo "$callback_url" | sed -E 's|https?://([^/]+).*|\1|')
    else
        local domain="localhost:5678"
    fi
    
    echo "访问地址："
    if [[ "$domain" == *"localhost"* ]]; then
        echo "  http://$domain"
    else
        echo "  https://$domain"
    fi
    echo ""
    echo "健康检查："
    echo "  http://localhost:5678/health"
    echo ""
    echo "常用命令："
    echo "  查看日志:   docker compose logs -f"
    echo "  查看状态:   docker compose ps"
    echo "  停止服务:   docker compose down"
    echo "  重启服务:   docker compose restart"
    echo "  更新部署:   docker compose pull && docker compose up -d"
    echo ""
    
    if [[ "$domain" != *"localhost"* ]]; then
        echo -e "${YELLOW}提示：${NC}"
        echo "  1. 请配置 Nginx/Caddy 反向代理到 localhost:5678"
        echo "  2. 确保 SSL 证书已正确配置"
        echo "  3. 在 Linux.do OAuth 应用中设置回调地址:"
        echo "     $LINUXDO_CALLBACK_URL"
        echo ""
    fi
}

# 主函数
main() {
    print_header
    
    check_environment
    echo ""
    
    configure_environment
    echo ""
    
    deploy_services
    echo ""
    
    health_check
    
    show_deployment_info
}

# 运行主函数
main "$@"
