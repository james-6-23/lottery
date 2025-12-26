# 刮刮乐彩票娱乐网站

一个基于 Go + React 的在线刮刮乐彩票娱乐平台。

## 快速开始

### 一键安装

```bash
bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/install.sh)
```

安装脚本支持两种模式：

| 模式 | OAuth 登录 | 适用场景 |
|------|-----------|----------|
| 开发模式 | 模拟登录（无需配置） | 本地测试、演示 |
| 生产模式 | LinuxDO OAuth | 正式部署 |

### 一键卸载

```bash
bash <(curl -sSL https://raw.githubusercontent.com/james-6-23/lottery/main/uninstall.sh)
```

## LinuxDO OAuth 配置

生产模式需要在 [connect.linux.do](https://connect.linux.do) 创建 OAuth 应用：

1. 登录 LinuxDO 后访问 OAuth 应用管理页面
2. 创建新应用，获取 `Client ID` 和 `Client Secret`
3. 设置回调地址为：`https://你的域名/oauth/callback`
4. 运行安装脚本时选择"生产模式"并填入以上信息

## 功能特性

- 多种彩票类型支持
- 积分钱包系统
- 商品兑换商城
- 保安码验证
- OAuth 登录 (GitHub)
- 管理后台

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + TailwindCSS |
| 后端 | Go + Gin + GORM |
| 数据库 | PostgreSQL / SQLite |
| 缓存 | Redis |
| 部署 | Docker + Nginx |

## 手动部署

### 使用 Docker Compose

```bash
# 克隆仓库
git clone https://github.com/james-6-23/lottery.git
cd lottery

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 使用预构建镜像

```bash
docker pull ghcr.io/james-6-23/lottery:latest
docker run -d -p 5678:5678 ghcr.io/james-6-23/lottery:latest
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_DRIVER` | 数据库类型 | `postgres` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | `lottery` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `JWT_SECRET` | JWT 密钥 | - |
| `OAUTH_MODE` | OAuth 模式 | `dev` |
| `LINUXDO_CLIENT_ID` | LinuxDO OAuth ID | - |
| `LINUXDO_SECRET` | LinuxDO OAuth Secret | - |
| `LINUXDO_CALLBACK_URL` | OAuth 回调地址 | - |

## 开发

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

### 后端开发

```bash
cd backend
go run ./cmd/server
```

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新到最新版本
docker compose pull && docker compose up -d
```

## License

MIT
