# huanghe123123's blog

一个前后端分离的技术博客平台：FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL 后端，React + TypeScript + Vite + Ant Design 前端。

## 架构

```
用户浏览器
    ├── blog.huanghe123123.asia  ──→  GitHub Pages（前端静态资源）
    └── api.huanghe123123.asia  ──→  Azure 服务器 Nginx → Docker Backend（:7000）
                                         │
                                         └── PostgreSQL 容器
```

- **前端**：构建为纯静态文件，部署到 GitHub Pages，通过 `VITE_API_BASE_URL` 指向后端 API
- **后端**：Docker 镜像存储在阿里云 ACR，GitHub Actions 自动构建推送，并通过 SSH 自动部署到 Azure 服务器（`docker compose pull && up -d`）
- **CI/CD**：推送 `main` 分支自动触发前端部署 + 后端镜像构建 + Azure 服务器自动更新

## 目录结构

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/          # HTTP 路由
│   │   ├── core/            # 配置（pydantic-settings）
│   │   ├── db/              # 数据库会话
│   │   ├── models/          # SQLAlchemy ORM
│   │   ├── schemas/         # Pydantic v2 DTO
│   │   ├── services/        # 业务逻辑
│   │   ├── utils/           # 安全/邮件等工具
│   │   └── main.py          # FastAPI 入口
│   ├── alembic/             # 数据库迁移
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios 客户端 + 接口模块
│   │   ├── components/      # 通用组件
│   │   ├── data/            # 静态数据（about.ts）
│   │   ├── hooks/           # useAuth 等
│   │   ├── layouts/         # 布局组件
│   │   ├── pages/           # 页面组件
│   │   ├── router/          # React Router 配置
│   │   └── types/           # TypeScript 类型
│   ├── public/
│   ├── index.html
│   └── package.json
├── deploy/
│   ├── docker-compose.yml   # 服务器生产部署 Compose（从 ACR 拉镜像运行）
│   └── nginx-api.conf       # 后端 Nginx 反向代理配置
├── .env                     # 密钥（gitignored，不提交）
├── config.yml               # 站点公开配置（可提交）
├── .github/workflows/
│   └── deploy.yml           # CI/CD 工作流
├── deploy/
│   └── docker-compose.yml   # 服务器部署 Compose（拉镜像，非构建）
├── docker-compose.yml       # 本地开发 Compose
├── .env.example             # 环境变量模板（可提交）
├── config.yml               # 站点公开配置
```

## 本地开发

```bash
# 首次使用：复制 .env.example 为 .env，本地开发可全用默认值
cp .env.example .env

# 启动全部服务（Postgres + 后端 + 前端）
docker compose up -d

# 后端测试
cd backend && pip install -r requirements.txt && pytest

# 前端开发（热重载）
cd frontend && npm install && npm run dev

# 数据库迁移
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "说明"
```

访问：

- 前端：http://你的域名/ip:5173
- 后端 API：http://你的域名/ip:7000
- OpenAPI 文档：http://你的域名/ip:7000/docs

## 生产部署

### 前置准备

| 项目 | 说明 |
|------|------|
| 域名 | `blog.huanghe123123.asia`（前端）、`api.huanghe123123.asia`（后端） |
| 服务器 | Azure 虚拟机 `azureuser@40.115.208.138`（自行安装 Docker + Compose 插件、Nginx） |
| DNS | Cloudflare，`blog` CNAME → `huanghe123123.github.io`，`api` A → `40.115.208.138`（关代理/灰色云） |
| SSL | 服务器 Nginx + Let's Encrypt（Certbot），通配符证书 `*.huanghe123123.asia` |
| 容器镜像 | 阿里云 ACR 个人版 `crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com/h-blog/blog-backend` |
| GitHub Secrets | ACR：`ACR_REGISTRY`、`ACR_NAMESPACE`、`ACR_USERNAME`、`ACR_PASSWORD`；SSH 部署：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY` |
| GitHub Variables | `VITE_API_BASE_URL` = `https://api.huanghe123123.asia/api`、`CNAME` = `blog.huanghe123123.asia` |

### 1. 服务器初始配置

> 前提：已在 Azure 服务器上安装好 Docker（含 Compose 插件）与 Nginx。

在服务器上创建部署目录，放入以下三个文件：

```bash
mkdir -p /opt/blog
cd /opt/blog

# 从仓库 deploy/ 拷入 docker-compose.yml，再放入 config.yml 与 .env
# config.yml — 站点公开配置（域名、主题、开关等），无密钥，可直接从仓库复制
# .env       — 镜像地址 + 所有密钥（gitignored，需手动创建），内容如下：
#
#   BACKEND_IMAGE=crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com/h-blog/blog-backend:latest
#   DATABASE_URL=postgresql+psycopg://user:pass@postgres:5432/blog
#   SECRET_KEY=<openssl rand -hex 32>
#   SMTP_USER=your@email.com
#   SMTP_PASSWORD=your_smtp_password
#   SMTP_FROM_EMAIL=your@email.com
#   GITHUB_CLIENT_SECRET=your_github_oauth_secret
#
#   也可追加 POSTGRES_USER / POSTGRES_PASSWORD 覆盖 docker-compose 默认值

# 登录 ACR（凭据持久化到 ~/.docker/config.json）
docker login crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com
```

### 2. Nginx 反向代理

反代配置已抽成文件 `deploy/nginx-api.conf`（将 `api` 域名转发到后端容器 `127.0.0.1:7000`）。拷贝并启用：

```bash
sudo cp deploy/nginx-api.conf /etc/nginx/sites-available/api
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 首次签发 SSL 证书（Certbot 会自动填好证书路径）
sudo certbot --nginx -d api.huanghe123123.asia
```

### 3. 拉取并启动

```bash
cd /opt/blog
docker compose pull          # 从 ACR 拉取最新镜像
docker compose up -d         # 启动 postgres + backend
docker compose logs backend  # 查看日志（含 alembic 迁移）
```

### 4. 更新流程（全自动）

推送代码到 `main` 分支后，GitHub Actions 自动完成：

1. **前端**：`npm ci → npm run build`（产物含 `404.html` = `index.html` 解决 SPA 路由刷新 404），部署到 `gh-pages` 分支 → GitHub Pages 自动生效
2. **后端**：Docker 构建并推送到 ACR
3. **部署**：SSH 连接 Azure 服务器，自动执行 `docker compose pull && up -d` 并清理旧镜像 —— 无需任何手动操作

> 自动部署依赖 GitHub Secrets `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY`（见前置准备）。
> 若需手动更新，仍可在服务器上执行 `cd /opt/blog && docker compose pull && docker compose up -d`。
>
> **注意**：首次部署前，需要先在服务器 `/opt/blog/` 下放好 `docker-compose.yml`、`config.yml` 和 `.env`（见步骤 1），这些文件不进 Docker 镜像，通过 volume 挂载到容器。后续更新由 CI 自动完成，配置文件无需重复操作。

### 5. Azure 网络安全组（NSG）

确保入站规则放行：TCP 22（SSH 自动部署）、80、443（Nginx）。7000 端口可选放行用于后端直连调试；正式环境建议只经 Nginx（443）访问，不对外暴露 7000。

## 常见问题

### 前端刷新非首页路径 404

构建时 `cp dist/index.html dist/404.html`，GitHub Pages 对未知路径返回 `404.html`（内容即完整 SPA），React Router 接管路由渲染。

### 前端无法连接后端 / 一直加载

- 确认 `VITE_API_BASE_URL` Variables 已设（末尾带 `/api`）
- 确认 `api` DNS 记录为 A 指向服务器 IP，且 Cloudflare 代理已关（灰色云）
- 确认服务器安全组放行 80/443 端口


### 后端启动报数据库连接失败

确认 `.env` 中 `DATABASE_URL` 的用户名密码与 docker-compose 的 `POSTGRES_USER` / `POSTGRES_PASSWORD` 一致。本地开发默认均为 `blog:blog`。

### Docker Hub 拉取超时

服务器配置镜像加速 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
```

## 接口测试

以下以生产环境为例，本地开发将域名换为 `http://localhost:7000`。

### 健康检查

```bash
curl https://api.huanghe123123.asia/api/health
# → {"status":"ok"}

curl https://api.huanghe123123.asia/api/config
# → {"site_name":"...","primary_color":"...","features":{...}}
```

### 注册

```bash
curl -X POST https://api.huanghe123123.asia/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"password123"}'
```

### 登录

```bash
curl -X POST https://api.huanghe123123.asia/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"password123"}'
```

> 登录成功会通过 `Set-Cookie` 设置 `access_token` 和 `refresh_token`（httpOnly）。后续请求浏览器自动携带，或手动带 `Cookie` header。

### 获取当前用户

```bash
curl https://api.huanghe123123.asia/api/users/me \
  -H "Cookie: access_token=<token>"
```

### 创建文章

```bash
curl -X POST https://api.huanghe123123.asia/api/posts \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","summary":"摘要","content":"# Markdown","category":"技术","status":"published"}'
```

### 获取文章列表

```bash
curl "https://api.huanghe123123.asia/api/posts?page=1&size=10"
```

### 获取文章详情

```bash
curl https://api.huanghe123123.asia/api/posts/1
```

### 搜索文章

```bash
curl "https://api.huanghe123123.asia/api/posts/search?keyword=Hello"
```

### 发表评论

```bash
curl -X POST https://api.huanghe123123.asia/api/posts/1/comments \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"写得好"}'
```

### 点赞文章

```bash
curl -X POST https://api.huanghe123123.asia/api/likes \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'
```

### 取消点赞

```bash
curl -X DELETE https://api.huanghe123123.asia/api/likes \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'
```

### 邮箱验证

```bash
# 重新发送验证邮件
curl -X POST https://api.huanghe123123.asia/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}'

# 使用邮件中的 token 完成验证
curl -X POST https://api.huanghe123123.asia/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<email-token>"}'
```

### 获取用户资料

```bash
curl https://api.huanghe123123.asia/api/users/1
```

### 登出

```bash
curl -X POST https://api.huanghe123123.asia/api/auth/logout \
  -H "Cookie: access_token=<token>"
```
