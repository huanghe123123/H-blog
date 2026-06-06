# huanghe123123's blog

一个前后端分离的技术博客平台：FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL 后端，React + TypeScript + Vite + Ant Design 前端。

## 架构

```
用户浏览器
    ├── blog.huanghe123123.asia  ──→  GitHub Pages（前端静态资源）
    └── api.huanghe123123.asia  ──→  自建服务器 Nginx → Docker Backend（:7000）
                                         │
                                         └── PostgreSQL 容器
```

- **前端**：构建为纯静态文件，部署到 GitHub Pages，通过 `VITE_API_BASE_URL` 指向后端 API
- **后端**：Docker 镜像存储在阿里云 ACR，GitHub Actions 自动构建推送，服务器 `docker-compose pull` 拉取运行
- **CI/CD**：推送 `main` 分支自动触发前端部署 + 后端镜像构建

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
│   └── docker-compose.yml   # 服务器生产部署 Compose
├── .github/workflows/
│   └── deploy.yml           # CI/CD 工作流
├── docker-compose.yml       # 本地开发 Compose
└── config.example.yml       # 后端配置模板
```

## 本地开发

```bash
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

- 前端：http://localhost:5173
- 后端 API：http://localhost:7000
- OpenAPI 文档：http://localhost:7000/docs

## 生产部署

### 前置准备

| 项目 | 说明 |
|------|------|
| 域名 | `blog.huanghe123123.asia`（前端）、`api.huanghe123123.asia`（后端） |
| DNS | Cloudflare，`blog` CNAME → `huanghe123123.github.io`，`api` A → 服务器 IP（关代理/灰色云） |
| SSL | 服务器 Nginx + Let's Encrypt（Certbot），通配符证书 `*.huanghe123123.asia` |
| 容器镜像 | 阿里云 ACR 个人版 `crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com/h-blog/blog-backend` |
| GitHub Secrets | `ACR_REGISTRY`、`ACR_NAMESPACE`、`ACR_USERNAME`、`ACR_PASSWORD` |
| GitHub Variables | `VITE_API_BASE_URL` = `https://api.huanghe123123.asia/api`、`CNAME` = `blog.huanghe123123.asia` |

### 1. 服务器初始配置

在服务器上创建部署目录并放置文件：

```bash
mkdir -p /opt/blog
cd /opt/blog

# 放入 deploy/docker-compose.yml 和 config.yml
# config.yml 中关键项：
#   server.backend_port: 7000
#   database.host: postgres（容器服务名）
#   frontend.url: "https://blog.huanghe123123.asia"
#   frontend.cors_origins: ["https://blog.huanghe123123.asia"]
#   auth.secret_key: 用 openssl rand -hex 32 生成
#   email.*: QQ 邮箱 SMTP 配置（smtp.qq.com, 端口 465）

# 登录 ACR
docker login crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com
```

### 2. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/api
server {
    server_name api.huanghe123123.asia;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/api.huanghe123123.asia/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.huanghe123123.asia/privkey.pem;
}

server {
    if ($host = api.huanghe123123.asia) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name api.huanghe123123.asia;
    return 404;
}
```

启用并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. 拉取并启动

```bash
cd /opt/blog
docker-compose pull          # 从 ACR 拉取最新镜像
docker-compose up -d         # 启动 postgres + backend
docker-compose logs backend  # 查看日志（含 alembic 迁移）
```

### 4. 更新流程

推送代码到 `main` 分支后，GitHub Actions 自动：

1. **前端**：`npm ci → npm run build`（产物含 `404.html` = `index.html` 解决 SPA 路由刷新 404），部署到 `gh-pages` 分支 → GitHub Pages 自动生效
2. **后端**：Docker 构建并推送到 ACR

服务器上手动更新后端：

```bash
cd /opt/blog
docker-compose pull && docker-compose up -d
docker image prune -f    # 清理旧镜像
```

### 5. 腾讯云安全组

确保入站规则放行：TCP 80、443（Nginx）、7000（后端直连调试）。

## 常见问题

### 前端刷新非首页路径 404

构建时 `cp dist/index.html dist/404.html`，GitHub Pages 对未知路径返回 `404.html`（内容即完整 SPA），React Router 接管路由渲染。

### 前端无法连接后端 / 一直加载

- 确认 `VITE_API_BASE_URL` Variables 已设（末尾带 `/api`）
- 确认 `api` DNS 记录为 A 指向服务器 IP，且 Cloudflare 代理已关（灰色云）
- 确认服务器安全组放行 80/443 端口

### 邮件验证链接点不开

确认 `config.yml` 中 `frontend.url` 为前端域名 `https://blog.huanghe123123.asia`（末尾不带 `/`）。

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
