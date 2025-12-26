# 刮刮乐彩票娱乐网站

一个模拟中国福利彩票即开型彩票游戏的在线娱乐平台。

## 功能特性

- 🎰 多种即开型彩票玩法（好运十倍、正当红、5倍惊喜等）
- 🎨 真实的刮奖动画体验（Canvas 实现）
- 🔐 Linux.do OAuth2 登录认证
- 💰 积分钱包系统
- 🛒 积分兑换商城
- 📊 管理后台数据统计
- 🔒 保安码验证系统

## 技术栈

### 前端
- React 19 + TypeScript
- Vite (Rolldown)
- Tailwind CSS + Shadcn/ui
- React Router

### 后端
- Go 1.24 + Gin
- GORM (SQLite/PostgreSQL)
- JWT 认证
- 内存缓存/Redis

## 快速开始

### 本地开发环境

#### 前置要求

- Go 1.24+
- Node.js 20+
- pnpm 或 npm

#### 1. 克隆项目

```bash
git clone https://github.com/your-username/scratch-lottery.git
cd scratch-lottery
```

#### 2. 启动后端

```bash
cd backend

# 复制环境变量配置
cp .env.example .env

# 安装依赖并启动
go mod download
go run ./cmd/server
```

后端默认运行在 http://localhost:8080

#### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端默认运行在 http://localhost:5173

### 开发模式说明

本地开发默认使用：
- **SQLite** 数据库（无需安装 PostgreSQL）
- **内存缓存**（无需安装 Redis）
- **模拟登录**（无需配置 OAuth2）

## Docker 部署

### 一键部署（推荐）

#### Linux/macOS

```bash
# 下载部署脚本
chmod +x deploy-prod.sh

# 运行一键部署
./deploy-prod.sh
```

#### Windows

```cmd
# 双击运行或在命令行执行
deploy-prod.bat
```

部署脚本会引导您完成：
1. 数据库配置（自动生成安全密码）
2. JWT 密钥配置（自动生成）
3. Linux.do OAuth 配置
4. Redis 配置
5. 支付配置（可选）
6. 自动部署 Docker 容器

### 手动部署

#### 1. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
vim .env
```

#### 2. 启动所有服务

```bash
# 生产环境（PostgreSQL + Redis）
docker compose up -d

# 或开发环境（SQLite + 内存缓存）
docker compose -f docker-compose.dev.yml up -d
```

#### 3. 访问应用

- 前端：http://localhost:5678
- 健康检查：http://localhost:5678/health

### Nginx 反向代理配置

生产环境建议使用 Nginx 反向代理并配置 SSL：

```bash
# 复制示例配置
cp nginx-prod.conf.example /etc/nginx/sites-available/lottery

# 修改域名和证书路径
vim /etc/nginx/sites-available/lottery

# 启用配置
ln -s /etc/nginx/sites-available/lottery /etc/nginx/sites-enabled/

# 测试并重载
nginx -t && systemctl reload nginx
```

### SSL 证书配置（Let's Encrypt）

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d lottery.example.com

# 自动续期
certbot renew --dry-run
```

## 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_DRIVER` | 数据库驱动 (sqlite/postgres) | sqlite |
| `DB_HOST` | PostgreSQL 主机 | localhost |
| `DB_PORT` | PostgreSQL 端口 | 5432 |
| `DB_USER` | 数据库用户名 | postgres |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | scratch_lottery |
| `DB_PATH` | SQLite 文件路径 | ./data/lottery.db |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `JWT_ACCESS_EXPIRY` | 访问令牌过期时间（分钟） | 15 |
| `JWT_REFRESH_EXPIRY` | 刷新令牌过期时间（天） | 7 |
| `OAUTH_MODE` | OAuth 模式 (dev/prod) | dev |
| `LINUXDO_CLIENT_ID` | Linux.do OAuth Client ID | - |
| `LINUXDO_SECRET` | Linux.do OAuth Secret | - |
| `CACHE_DRIVER` | 缓存驱动 (memory/redis) | memory |
| `REDIS_HOST` | Redis 主机 | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `PAYMENT_ENABLED` | 是否启用支付 | false |
| `ENCRYPTION_KEY` | AES 加密密钥（32字节） | - |

## API 文档

### 认证接口

```
GET  /api/auth/mode              # 获取认证模式
GET  /api/auth/dev/users         # 获取开发模式用户列表
POST /api/auth/login/dev         # 开发模式登录
POST /api/auth/refresh           # 刷新令牌
POST /api/auth/logout            # 登出
GET  /api/auth/oauth/linuxdo     # Linux.do OAuth 登录
GET  /api/auth/oauth/callback    # OAuth 回调
GET  /api/auth/me                # 获取当前用户信息
```

### 彩票接口

```
GET  /api/lottery/types              # 获取彩票类型列表
GET  /api/lottery/types/:id          # 获取彩票类型详情
GET  /api/lottery/types/:id/prize-levels  # 获取奖级设置
GET  /api/lottery/types/:id/prize-pools   # 获取奖组列表
POST /api/lottery/purchase           # 购买彩票
GET  /api/lottery/tickets            # 获取用户彩票列表
GET  /api/lottery/tickets/:id        # 获取彩票详情
POST /api/lottery/scratch/:id        # 刮开彩票
GET  /api/lottery/verify/:code       # 验证保安码
```

### 钱包接口

```
GET  /api/wallet                 # 获取钱包信息
GET  /api/wallet/balance         # 获取余额
GET  /api/wallet/transactions    # 获取交易记录
```

### 兑换接口

```
GET  /api/exchange/products      # 获取商品列表
GET  /api/exchange/products/:id  # 获取商品详情
POST /api/exchange/redeem        # 兑换商品
GET  /api/exchange/records       # 获取兑换记录
```

### 用户接口

```
GET  /api/user/profile           # 获取用户资料
GET  /api/user/tickets           # 获取购彩记录
GET  /api/user/wins              # 获取中奖记录
GET  /api/user/statistics        # 获取游戏统计
```

### 管理接口

```
GET  /api/admin/dashboard        # 数据概览
POST /api/admin/lottery/types    # 创建彩票类型
PUT  /api/admin/lottery/types/:id    # 更新彩票类型
DELETE /api/admin/lottery/types/:id  # 删除彩票类型
GET  /api/admin/users            # 用户列表
PUT  /api/admin/users/:id/points # 调整用户积分
GET  /api/admin/settings         # 获取系统设置
PUT  /api/admin/settings         # 更新系统设置
GET  /api/admin/statistics       # 统计数据
```

## 项目结构

```
scratch-lottery/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                 # API 请求
│   │   ├── components/          # 通用组件
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── pages/               # 页面组件
│   │   ├── store/               # 状态管理
│   │   └── lib/                 # 工具函数
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                     # 后端项目
│   ├── cmd/server/              # 入口文件
│   ├── internal/
│   │   ├── config/              # 配置管理
│   │   ├── handler/             # HTTP 处理器
│   │   ├── middleware/          # 中间件
│   │   ├── model/               # 数据模型
│   │   ├── repository/          # 数据访问
│   │   ├── service/             # 业务逻辑
│   │   └── cache/               # 缓存抽象
│   ├── pkg/                     # 公共包
│   └── Dockerfile
├── docker-compose.yml           # 生产环境配置
├── docker-compose.dev.yml       # 开发环境配置
├── .github/workflows/           # CI/CD 配置
└── README.md
```

## 开发指南

### 运行测试

```bash
# 后端测试
cd backend
go test -v ./...

# 前端 lint
cd frontend
npm run lint
```

### 代码规范

- 后端使用 `go vet` 和 `staticcheck` 进行代码检查
- 前端使用 ESLint 进行代码检查
- 提交前请确保所有测试通过

### 数据库迁移

后端启动时会自动执行数据库迁移，无需手动操作。

## CI/CD

项目使用 GitHub Actions 进行持续集成和部署：

- **CI 流程**：代码推送到 main/develop 分支时自动运行测试和构建
- **Release 流程**：创建 Git Tag 时自动构建 Docker 镜像并推送到 GitHub Container Registry

### 发布新版本

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

## 许可证

MIT License
