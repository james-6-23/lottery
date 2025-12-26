@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   刮刮乐彩票娱乐网站 - 开发环境部署
echo ==========================================
echo.

:: 生成随机字符串函数
set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "JWT_SECRET="
set "ENCRYPTION_KEY="

for /L %%i in (1,1,32) do (
    set /a "idx=!random! %% 62"
    for %%j in (!idx!) do set "JWT_SECRET=!JWT_SECRET!!chars:~%%j,1!"
)

for /L %%i in (1,1,32) do (
    set /a "idx=!random! %% 62"
    for %%j in (!idx!) do set "ENCRYPTION_KEY=!ENCRYPTION_KEY!!chars:~%%j,1!"
)

echo 📝 生成配置文件...

:: 创建 .env 文件
(
echo # 刮刮乐彩票娱乐网站 - 开发环境配置
echo.
echo # ===================
echo # 数据库设置
echo # ===================
echo DB_USER=postgres
echo DB_PASSWORD=123456
echo DB_NAME=scratch_lottery
echo.
echo # ===================
echo # JWT 设置
echo # ===================
echo JWT_SECRET=!JWT_SECRET!
echo JWT_ACCESS_EXPIRY=60
echo JWT_REFRESH_EXPIRY=30
echo.
echo # ===================
echo # OAuth 设置 ^(开发模式 - 模拟登录^)
echo # ===================
echo OAUTH_MODE=dev
echo LINUXDO_CLIENT_ID=
echo LINUXDO_SECRET=
echo LINUXDO_CALLBACK_URL=
echo.
echo # ===================
echo # Redis 设置
echo # ===================
echo REDIS_PASSWORD=
echo.
echo # ===================
echo # 支付设置 ^(关闭^)
echo # ===================
echo PAYMENT_ENABLED=false
echo EPAY_MERCHANT_ID=
echo EPAY_SECRET=
echo EPAY_CALLBACK_URL=
echo.
echo # ===================
echo # 加密设置
echo # ===================
echo ENCRYPTION_KEY=!ENCRYPTION_KEY!
) > .env

echo ✅ 配置文件已生成
echo.

:: 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

echo 🐳 启动 Docker 容器...
docker compose -f docker-compose.dev.yml down 2>nul
docker compose -f docker-compose.dev.yml up -d --build

echo.
echo ⏳ 等待服务启动...
timeout /t 15 /nobreak >nul

echo.
echo ==========================================
echo   🎉 部署完成！
echo ==========================================
echo.
echo 访问地址：
echo   前端：http://localhost
echo   后端：http://localhost:8080
echo   健康检查：http://localhost:8080/health
echo.
echo 登录方式：开发模式模拟登录（无需 OAuth2）
echo.
echo 常用命令：
echo   查看日志：docker compose -f docker-compose.dev.yml logs -f
echo   停止服务：docker compose -f docker-compose.dev.yml down
echo   重启服务：docker compose -f docker-compose.dev.yml restart
echo.
pause
