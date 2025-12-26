@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   刮刮乐彩票娱乐网站 - 开发环境部署
echo ==========================================
echo.

:: 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

echo 🐳 构建并启动 Docker 容器...
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
echo 访问地址：http://localhost:5678
echo 健康检查：http://localhost:5678/health
echo.
echo 登录方式：开发模式模拟登录（无需 OAuth2）
echo.
echo 常用命令：
echo   查看日志：docker compose -f docker-compose.dev.yml logs -f
echo   停止服务：docker compose -f docker-compose.dev.yml down
echo   重启服务：docker compose -f docker-compose.dev.yml restart
echo.
pause
