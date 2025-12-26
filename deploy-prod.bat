@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ============================================
:: 刮刮乐彩票娱乐网站 - 生产环境一键部署脚本 (Windows)
:: ============================================

title 刮刮乐彩票 - 生产环境部署

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║       🎰 刮刮乐彩票娱乐网站 - 生产环境部署                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: 检查 Docker
echo [检查] Docker 环境...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未安装，请先安装 Docker Desktop
    echo        下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [成功] Docker 已安装

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker Compose 未安装
    pause
    exit /b 1
)
echo [成功] Docker Compose 已安装
echo.

:: 检查 .env 文件
if exist ".env" (
    echo [提示] 检测到已存在 .env 配置文件
    set /p RECONFIGURE="是否重新配置? (y/N): "
    if /i "!RECONFIGURE!"=="y" (
        copy .env ".env.backup.%date:~0,4%%date:~5,2%%date:~8,2%" >nul
        echo [提示] 已备份原配置文件
        goto :configure
    ) else (
        echo [提示] 使用现有配置
        goto :deploy
    )
)

:configure
echo.
echo === 数据库配置 ===
set /p DB_USER="数据库用户名 [postgres]: "
if "!DB_USER!"=="" set DB_USER=postgres

set /p DB_PASSWORD="数据库密码 (留空自动生成): "
if "!DB_PASSWORD!"=="" (
    for /f %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(16,2)"') do set DB_PASSWORD=%%i
    echo   已生成数据库密码: !DB_PASSWORD!
)

set /p DB_NAME="数据库名称 [scratch_lottery]: "
if "!DB_NAME!"=="" set DB_NAME=scratch_lottery

echo.
echo === JWT 配置 ===
set /p JWT_SECRET="JWT 密钥 (留空自动生成): "
if "!JWT_SECRET!"=="" (
    for /f %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64,4)"') do set JWT_SECRET=%%i
    echo   已生成 JWT 密钥
)

set /p JWT_ACCESS_EXPIRY="访问令牌过期时间(分钟) [15]: "
if "!JWT_ACCESS_EXPIRY!"=="" set JWT_ACCESS_EXPIRY=15

set /p JWT_REFRESH_EXPIRY="刷新令牌过期时间(天) [7]: "
if "!JWT_REFRESH_EXPIRY!"=="" set JWT_REFRESH_EXPIRY=7

echo.
echo === Linux.do OAuth 配置 ===
echo   请在 https://connect.linux.do 申请 OAuth 应用
set /p LINUXDO_CLIENT_ID="Client ID: "
set /p LINUXDO_SECRET="Client Secret: "
set /p DOMAIN="您的域名 (如 lottery.example.com): "

if not "!DOMAIN!"=="" (
    set LINUXDO_CALLBACK_URL=https://!DOMAIN!/oauth/callback
) else (
    set /p LINUXDO_CALLBACK_URL="OAuth 回调地址 (必填): "
    if "!LINUXDO_CALLBACK_URL!"=="" (
        echo [错误] OAuth 回调地址不能为空
        pause
        exit /b 1
    )
)

echo.
echo === Redis 配置 ===
set /p REDIS_PASSWORD="Redis 密码 (留空不设密码): "

echo.
echo === 支付配置 (可选) ===
set /p ENABLE_PAYMENT="是否启用支付功能? (y/N): "
if /i "!ENABLE_PAYMENT!"=="y" (
    set PAYMENT_ENABLED=true
    set /p EPAY_MERCHANT_ID="易支付商户ID: "
    set /p EPAY_SECRET="易支付密钥: "
    if not "!DOMAIN!"=="" (
        set EPAY_CALLBACK_URL=https://!DOMAIN!/api/payment/callback
    ) else (
        set /p EPAY_CALLBACK_URL="支付回调地址: "
    )
) else (
    set PAYMENT_ENABLED=false
    set EPAY_MERCHANT_ID=
    set EPAY_SECRET=
    set EPAY_CALLBACK_URL=
)

:: 生成加密密钥
for /f %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32,4)"') do set ENCRYPTION_KEY=%%i
echo.
echo   已生成 AES-256 加密密钥

:: 写入 .env 文件
echo.
echo [配置] 保存环境变量...
(
echo # ============================================
echo # 刮刮乐彩票娱乐网站 - 生产环境配置
echo # 生成时间: %date% %time%
echo # ============================================
echo.
echo # Database Settings
echo DB_USER=!DB_USER!
echo DB_PASSWORD=!DB_PASSWORD!
echo DB_NAME=!DB_NAME!
echo.
echo # JWT Settings
echo JWT_SECRET=!JWT_SECRET!
echo JWT_ACCESS_EXPIRY=!JWT_ACCESS_EXPIRY!
echo JWT_REFRESH_EXPIRY=!JWT_REFRESH_EXPIRY!
echo.
echo # OAuth Settings
echo OAUTH_MODE=prod
echo LINUXDO_CLIENT_ID=!LINUXDO_CLIENT_ID!
echo LINUXDO_SECRET=!LINUXDO_SECRET!
echo LINUXDO_CALLBACK_URL=!LINUXDO_CALLBACK_URL!
echo.
echo # Redis Settings
echo REDIS_PASSWORD=!REDIS_PASSWORD!
echo.
echo # Payment Settings
echo PAYMENT_ENABLED=!PAYMENT_ENABLED!
echo EPAY_MERCHANT_ID=!EPAY_MERCHANT_ID!
echo EPAY_SECRET=!EPAY_SECRET!
echo EPAY_CALLBACK_URL=!EPAY_CALLBACK_URL!
echo.
echo # Encryption Settings
echo ENCRYPTION_KEY=!ENCRYPTION_KEY!
) > .env

echo [成功] 配置已保存到 .env 文件

:deploy
echo.
echo [部署] 启动 Docker 服务...

:: 停止旧服务
docker compose down 2>nul

:: 拉取最新镜像
echo [部署] 拉取最新镜像...
docker compose pull

:: 启动服务
echo [部署] 启动服务...
docker compose up -d

echo.
echo [检查] 等待服务启动...
timeout /t 15 /nobreak >nul

:: 健康检查
curl -s http://localhost:5678/health >nul 2>&1
if errorlevel 1 (
    echo [警告] 服务可能还在启动中，请稍后检查
) else (
    echo [成功] 服务健康检查通过
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    🎉 部署完成！                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 访问地址: http://localhost:5678
echo 健康检查: http://localhost:5678/health
echo.
echo 常用命令:
echo   查看日志:   docker compose logs -f
echo   查看状态:   docker compose ps
echo   停止服务:   docker compose down
echo   重启服务:   docker compose restart
echo.

pause
