# H-Blog

一个前后端分离的技术博客平台，基于 FastAPI + React + PostgreSQL，支持 Markdown 写作、GitHub OAuth 登录、AI 智能助手、Live2D 看板娘等特性。

## 特性

### 写作与内容管理
- **Markdown 编辑器**：支持完整的 Markdown 语法，所见即所得
- **文章分类与标签**：内置技术、创作、生活、交流、公告五大分类
- **草稿与发布**：支持草稿模式，写完再发布
- **文章搜索**：支持关键词搜索、模糊搜索、分类筛选、日期范围筛选

### 社交互动
- **评论系统**：支持嵌套回复，可删除自己或他人（管理员）的评论
- **点赞系统**：文章和评论均可点赞，支持取消点赞
- **用户主页**：展示个人简介、文章列表、留言板

### 认证与权限
- **多方式登录**：支持用户名 / 昵称 / 邮箱 + 密码登录，也支持 GitHub OAuth 登录
- **五级角色体系**：guest < user < moderator < admin < owner，粒度精细的权限控制
- **GitHub OAuth 新用户引导**：首次授权登录后引导设置密码，之后即可用邮箱+密码登录
- **JWT 双 Token 机制**：access token（短期，15 分钟）+ refresh token（长期，7 天），httpOnly cookie 安全传输
- **邮箱验证**：可选开启，注册后发送验证链接

### AI 智能助手
- **Agent API**：支持 OpenAI 兼容的 function-calling 模式，可按角色过滤可用工具
- **多模型支持**：通过环境变量切换任意 OpenAI 兼容接口（OpenRouter / DeepSeek / 智谱 GLM 等）
- **18+ 内置工具**：搜索文章、查看内容、管理评论、发布文章等，按角色授权
- **Live2D 看板娘集成**：右键看板娘即可唤起 AI 对话框，对话时显示气泡反馈
- **上下文感知**：根据当前页面自动注入上下文（文章详情页可总结文章、首页可浏览最新内容）
- **可拖动对话框**：AI 对话窗口支持自由拖动，位置记忆

### 其他
- **Live2D 看板娘**：基于 oh-my-live2d，支持菜单交互、气泡提示
- **首页问候语**：按时段自动显示早安 / 午安 / 晚上好

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.x（async-style 声明式映射） |
| 数据库迁移 | Alembic |
| 数据库 | PostgreSQL 16 |
| 认证 | JWT（python-jose）+ bcrypt（passlib） |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Ant Design 5 |
| 路由 | React Router 7 |
| HTTP 客户端 | Axios |
| Live2D | oh-my-live2d |
| LLM 调用 | httpx 直调 OpenAI 兼容 API（tool-calling） |

## 架构

```
用户浏览器
    ├── 前端静态资源  ──→  CDN / 静态托管 / Nginx
    └── API 请求      ──→  Nginx 反向代理 → Backend (:7000)
                                                   │
                                                   └── PostgreSQL
```

- **前端**：纯静态文件，构建后部署到任意静态托管服务（GitHub Pages / Vercel / Nginx 等），通过 `VITE_API_BASE_URL` 指向后端 API 地址
- **后端**：Docker 容器化部署，启动时自动执行数据库迁移
- **配置分离**：公开配置存于 `config.yml`（可提交），密钥存于 `.env`（gitignored）

## 目录结构

```
.
├── backend/
│   ├── app/
│   │   ├── api/deps.py        # FastAPI 依赖注入（认证、权限）
│   │   ├── api/v1/            # HTTP 路由（auth, posts, comments, likes, users, admin, agent）
│   │   ├── core/              # 配置管理（pydantic-settings，config.yml + .env 双源）
│   │   ├── db/                # 数据库会话工厂
│   │   ├── models/            # SQLAlchemy ORM 模型（User, Post, Comment, Like）
│   │   ├── schemas/           # Pydantic v2 请求/响应模型
│   │   ├── services/          # 业务逻辑层
│   │   ├── utils/             # 工具函数（密码哈希、JWT、邮件）
│   │   └── main.py            # FastAPI 应用入口
│   ├── alembic/               # 数据库迁移脚本
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios 客户端 + 各资源 API 模块
│   │   ├── components/        # 通用组件（AgentChat, LikeButton, PostCard...）
│   │   ├── hooks/             # 自定义 Hook（useAuth）
│   │   ├── layouts/           # 布局组件（AppLayout）
│   │   ├── pages/             # 页面组件
│   │   ├── router/            # React Router 配置
│   │   └── types/             # TypeScript 类型定义
│   ├── public/live2d/         # Live2D 模型文件
│   └── package.json
├── deploy/
│   ├── docker-compose.yml     # 生产环境 Docker Compose（拉取镜像部署）
│   ├── config.yml             # 生产环境公开配置（可提交）
│   └── nginx-api.conf         # Nginx 反向代理配置模板
├── docker-compose.yml         # 本地开发 Docker Compose（源码挂载 + 热重载）
├── config.yml                 # 站点公开配置（可提交，不含密钥）
├── .env.example               # 环境变量模板（含所有可用变量及说明）
└── .env                       # 实际密钥（已 gitignore，不提交）
```

## 快速开始（本地开发）

### 1. 准备环境

确保已安装 Docker 和 Docker Compose 插件。

```bash
# 克隆仓库
git clone <your-repo-url>
cd <repo>

# 复制环境变量模板，本地开发可全用默认值
cp .env.example .env
```

### 2. 修改配置

编辑 `config.yml`，至少修改：

```yaml
frontend:
  url: "http://localhost:5173"     # 前端访问地址
  cors_origins:
    - "http://localhost:5173"

github:
  client_id: ""                    # 如需 GitHub 登录，填入 OAuth App 的 client_id
  redirect_uri: "http://localhost:5173/api/auth/github/callback"
```

如需启用邮箱验证，在 `.env` 中填入 SMTP 凭据，并将 `config.yml` 中 `features.email_verification` 设为 `true`。

### 3. 启动服务

```bash
# 启动全部服务（Postgres + 后端 + 前端）
docker compose up -d

# 查看日志（含数据库迁移结果）
docker compose logs backend
```

### 4. 访问

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:7000 |
| API 文档（Swagger） | http://localhost:7000/docs |
| API 文档（ReDoc） | http://localhost:7000/redoc |

### 5. 常用命令

```bash
# 后端测试
cd backend && pip install -r requirements.txt && pytest

# 运行单个测试
cd backend && pytest tests/test_schemas.py::test_user_register_validation

# 数据库迁移（生成新迁移文件）
docker compose exec backend alembic revision --autogenerate -m "描述"

# 数据库迁移（应用迁移）
docker compose exec backend alembic upgrade head

# 前端开发（宿主机热重载，绕过 Docker）
cd frontend && npm install && npm run dev

# 前端类型检查 + 构建
cd frontend && npm run build
```

## 生产部署

### 部署文件准备

仓库的 `deploy/` 目录包含部署相关文件。其中 `docker-compose.yml` 是通用模板，随仓库追踪；而 `.env`、`config.yml`、`nginx-api.conf` 包含个人配置，已被 gitignore。

部署流程如下：

1. 参考 `.env.example` 创建 `.env`，填入你的密钥和配置
2. 参考根目录 `config.yml` 修改域名等生产环境配置
3. 将以下文件复制到 `deploy/` 目录：

```bash
cp .env deploy/.env
cp config.yml deploy/config.yml
```

4. `deploy/` 目录最终结构：

```
deploy/
├── docker-compose.yml    # 通用模板（git 追踪）
├── .env                  # 生产环境密钥（gitignored）
├── config.yml            # 生产环境站点配置（gitignored）
└── nginx-api.conf        # Nginx 配置（gitignored，按需创建）
```

### 部署架构

生产环境建议使用以下架构：

```
Internet → Nginx (HTTPS) → Backend 容器 (:7000) → PostgreSQL 容器
                        → 前端静态文件（Nginx 直接 serve 或 CDN）
```

### 前置准备

| 项目 | 说明 |
|------|------|
| 服务器 | 任意 Linux 服务器，需安装 Docker + Compose 插件 + Nginx |
| 域名 | 前端域名（如 `blog.example.com`）和后端 API 域名（如 `api.example.com`） |
| SSL 证书 | 推荐 Certbot（Let's Encrypt）自动签发，免费自动续期 |
| 容器镜像仓库 | Docker Hub / GitHub Container Registry / 阿里云 ACR 等均可 |

### 1. 配置生产环境变量

在项目根目录创建 `.env`（参考 `.env.example`）：

```bash
# .env — 生产环境密钥（不上传至仓库）

# 数据库连接（含密码）
DATABASE_URL=postgresql+psycopg://<user>:<password>@postgres:5432/blog

# 数据库账号（Docker Compose 使用）
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=blog

# 站主用户 ID（注册第一个用户后在数据库中确认其 ID 填入）
SITE_OWNER=1

# JWT 密钥（生成命令：openssl rand -hex 32）
SECRET_KEY=<your-generated-secret>

# 邮箱 SMTP 凭据（不启用邮件验证可不填）
SMTP_USER=<your-email>
SMTP_PASSWORD=<smtp-password-or-auth-code>
SMTP_FROM_EMAIL=<your-email>

# GitHub OAuth（不启用 GitHub 登录可不填）
GITHUB_CLIENT_SECRET=<your-github-oauth-client-secret>

# LLM API（不启用 AI Agent 可不填，支持任意 OpenAI 兼容接口）
LLM_API_KEY=<your-api-key>
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-4-flash

# AI Agent 功能开关
AGENT_ENABLED=true

# 后端容器镜像地址
BACKEND_IMAGE=<your-registry>/<namespace>/blog-backend:latest
```

修改 `config.yml` 指向你的域名：

```yaml
frontend:
  url: "https://blog.example.com"
  cors_origins:
    - "https://blog.example.com"

github:
  client_id: "<your-client-id>"
  redirect_uri: "https://api.example.com/api/auth/github/callback"

features:
  email_verification: true
  agent: true
```

### 2. 服务器准备

配置好 `.env` 和 `config.yml` 后，复制到 `deploy/` 目录，然后上传到服务器：

```bash
mkdir -p /opt/blog
cd /opt/blog

# 从本地 deploy/ 上传
scp deploy/.env deploy/config.yml deploy/docker-compose.yml <user>@<server>:/opt/blog/
```

登录容器镜像仓库（如使用私有仓库）：

```bash
docker login <your-registry>
```

### 3. Nginx 反向代理

将仓库中的 `deploy/nginx-api.conf` 作为模板，修改 `server_name` 为你的 API 域名：

```nginx
server {
    server_name api.example.com;   # 改为你的 API 域名

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
}

server {
    if ($host = api.example.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name api.example.com;
    return 404;
}
```

部署并签发证书：

```bash
sudo cp nginx-api.conf /etc/nginx/sites-available/api
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 签发 SSL 证书（Certbot 自动填写证书路径）
sudo certbot --nginx -d api.example.com
```

### 4. 构建并推送后端镜像

```bash
# 在本地仓库根目录构建
docker build -t <your-registry>/<namespace>/blog-backend:latest ./backend

# 推送到镜像仓库
docker push <your-registry>/<namespace>/blog-backend:latest
```

### 5. 启动服务

```bash
# 在服务器上执行
cd /opt/blog
docker compose pull            # 拉取最新镜像
docker compose up -d           # 启动 postgres + backend
docker compose logs backend    # 查看日志（确认 alembic 迁移成功）
```

### 6. 前端部署

前端是纯静态文件，可部署到任意静态托管服务：

```bash
cd frontend

# 用你的后端 API 地址构建
VITE_API_BASE_URL=https://api.example.com/api npm run build

# 产物在 dist/ 目录，上传到你的静态托管即可
# 可选方案：GitHub Pages / Vercel / Netlify / Nginx 直接 serve
```

> **SPA 路由注意事项**：部署静态文件时需要配置 fallback，将所有未匹配的路径回退到 `index.html`。Nginx 示例：`try_files $uri $uri/ /index.html;`。其他托管平台各有对应的 SPA 配置方式。

### 7. 安全组（防火墙）

确保服务器入站规则放行：
- TCP 22（SSH）
- TCP 80 / 443（HTTP / HTTPS）

后端 7000 端口建议不对外暴露，只通过 Nginx（443）访问。

### 8. 更新流程

后续更新只需：

```bash
# 构建并推送新镜像
docker build -t <your-registry>/<namespace>/blog-backend:latest ./backend
docker push <your-registry>/<namespace>/blog-backend:latest

# 在服务器上拉取并重启
ssh <user>@<server> "cd /opt/blog && docker compose pull && docker compose up -d"
```

## CI/CD（GitHub Actions）

仓库自带一套完整的 GitHub Actions 工作流（`.github/workflows/deploy.yml`），推送代码到 `main` 分支后自动完成前端部署 + 后端镜像构建推送 + 服务器更新。

### 工作流概览

```
git push main
    │
    ├── Job: frontend
    │   ├── npm ci → npm run build
    │   └── 部署 dist/ 到 GitHub Pages（gh-pages 分支）
    │
    └── Job: backend
        ├── Docker 构建后端镜像
        ├── 推送到容器镜像仓库
        └── SSH 到服务器 → docker compose pull && up -d
```

两个 Job 并行执行，互不阻塞。

### 所需 Secrets 与 Variables

在仓库 **Settings → Secrets and variables → Actions** 中配置：

**Variables**（非敏感，前端构建使用）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_API_BASE_URL` | 后端 API 地址（末尾带 `/api`） | `https://api.example.com/api` |
| `CNAME` | GitHub Pages 自定义域名（不用 GP Pages 可不设） | `blog.example.com` |

**Secrets**（敏感信息，加密存储）：

| Secret | 说明 |
|--------|------|
| `ACR_REGISTRY` | 容器镜像仓库地址，如 `crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com` |
| `ACR_NAMESPACE` | 镜像仓库命名空间，如 `my-namespace` |
| `ACR_USERNAME` | 镜像仓库用户名 |
| `ACR_PASSWORD` | 镜像仓库密码 / 访问凭证 |
| `DEPLOY_HOST` | 服务器 IP 或域名 |
| `DEPLOY_USER` | 服务器 SSH 用户名 |
| `DEPLOY_SSH_KEY` | 服务器 SSH 私钥（对应服务器上 `~/.ssh/authorized_keys` 中的公钥） |

### 生成 SSH 密钥对（用于自动部署）

```bash
# 在本地生成专用密钥对（不要覆盖已有的 id_rsa）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions

# 公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions.pub <user>@<server>

# 查看私钥内容，填入 GitHub Secrets 的 DEPLOY_SSH_KEY
cat ~/.ssh/github_actions
```

### 适配不同镜像仓库

工作流中镜像仓库地址通过 Secrets 注入，支持任意兼容 Docker Registry 的服务：

| 镜像仓库 | `ACR_REGISTRY` 示例 | 备注 |
|----------|---------------------|------|
| Docker Hub | `docker.io` | `ACR_NAMESPACE` 填用户名 |
| GitHub Container Registry | `ghcr.io` | `ACR_NAMESPACE` 填用户名/组织名 |
| 阿里云 ACR | `crpi-xxx.cn-hangzhou.personal.cr.aliyuncs.com` | 国内拉取速度快 |
| 腾讯云 TCR | `ccr.ccs.tencentyun.com` | — |
| 自建 Registry | `registry.example.com` | — |

### 服务器端准备

首次部署前，需在服务器上创建 `/opt/blog` 目录并放入初始文件（之后 CI 自动更新即可）：

```bash
mkdir -p /opt/blog
cd /opt/blog

# 放入三个文件：
#   docker-compose.yml — 从仓库 deploy/ 目录复制
#   config.yml         — 生产环境站点配置
#   .env               — 生产环境密钥（含 BACKEND_IMAGE 指向你的镜像仓库）

# 登录镜像仓库（如为私有仓库）
docker login <your-registry>
```

### 手动触发

除了 push 自动触发，也可以在 GitHub Actions 页面手动点击 **Run workflow** 触发部署，无需推送代码。

## 配置参考

### config.yml 结构

```yaml
site:           # 站点名称、介绍文字及颜色
server:         # 后端监听地址、端口、API 前缀
database:       # 数据库连接信息（凭据通过 .env 注入）
auth:           # JWT 算法、Token 有效期、Cookie 安全策略
email:          # SMTP 服务器信息（凭据通过 .env 注入）
frontend:       # 前端访问 URL、CORS 白名单
theme:          # Ant Design 主色调、圆角、语言
home:           # 首页问候语开关、标语
github:         # GitHub OAuth 配置（client_secret 通过 .env 注入）
features:       # 功能开关（邮箱验证、评论、点赞、AI Agent、MCP）
```

### .env 变量一览

| 变量 | 说明 | 必填 |
|------|------|:----:|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ |
| `SECRET_KEY` | JWT 签名密钥 | ✅ |
| `SITE_OWNER` | 站主用户 ID | 推荐 |
| `POSTGRES_USER/PASSWORD/DB` | Docker Compose 数据库账号 | 推荐 |
| `SMTP_USER/PASSWORD/FROM_EMAIL` | 邮件发送凭据 | 可选 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 密钥 | 可选 |
| `LLM_API_KEY/BASE_URL/MODEL` | AI Agent 的 LLM 配置 | 可选 |
| `AGENT_ENABLED` | AI Agent 开关（`true`/`false`） | 可选 |
| `MCP_KEY_OWNER/ADMIN/USER` | MCP Server 三级 API Key | 可选 |
| `BACKEND_IMAGE` | 生产部署的后端镜像地址 | 生产必填 |
| `POSTGRES_IMAGE/PYTHON_IMAGE/NODE_IMAGE` | Docker 镜像源（国内可换加速源） | 可选 |

### 角色权限

| 角色 | 浏览 | 评论/点赞 | 发布文章 | 管理他人内容 | 管理用户 | 管理管理员 |
|------|:----:|:---------:|:--------:|:------------:|:--------:|:----------:|
| guest | ✅ | | | | | |
| user | ✅ | ✅ | | | | |
| moderator | ✅ | ✅ | ✅（公告） | | | |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | |
| owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

- **owner** 由 `SITE_OWNER` 环境变量指定，不存储在数据库中（防篡改）
- **admin** 不能操作同级 admin，只有 owner 能管理 admin
- 所有权限检查在 `app/api/deps.py` 和 `app/services/` 中实现

## API 接口速览

以下以本地环境为例，生产环境替换域名即可。

### 健康检查与站点配置

```bash
# 健康检查
curl http://localhost:7000/api/health
# → {"status":"ok"}

# 站点公开配置
curl http://localhost:7000/api/config
```

### 认证

```bash
# 注册
curl -X POST http://localhost:7000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"password123"}'

# 登录（支持用户名 / 昵称 / 邮箱）
curl -X POST http://localhost:7000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"password123"}'
```

> 登录成功会通过 `Set-Cookie` 设置 `access_token` 和 `refresh_token`（httpOnly），后续请求浏览器自动携带。

### 文章

```bash
# 获取文章列表
curl "http://localhost:7000/api/posts?page=1&size=10&sort_by=created_at"

# 搜索文章
curl "http://localhost:7000/api/posts/search?keyword=Python&category=技术"

# 获取文章详情
curl http://localhost:7000/api/posts/1

# 创建文章（需登录）
curl -X POST http://localhost:7000/api/posts \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","summary":"摘要","content":"# Markdown","category":"技术","status":"published"}'
```

### 评论

```bash
# 获取文章评论
curl http://localhost:7000/api/posts/1/comments

# 发表评论（需登录）
curl -X POST http://localhost:7000/api/posts/1/comments \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"写得好"}'

# 删除评论（需登录，只能删自己或管理员）
curl -X DELETE http://localhost:7000/api/comments/1 \
  -H "Cookie: access_token=<token>"
```

### 点赞

```bash
# 点赞文章
curl -X POST http://localhost:7000/api/likes \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'

# 取消点赞
curl -X DELETE http://localhost:7000/api/likes \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'
```

### AI Agent

```bash
# 与 AI 助手对话（需登录）
curl -X POST http://localhost:7000/api/agent \
  -H "Cookie: access_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我搜索关于Python的文章","context":{"page":"home"}}'
```

### 更多接口

完整 API 文档见 Swagger UI：http://localhost:7000/docs

## AI Agent 工具列表

| 工具名 | 最低角色 | 功能 |
|--------|:--------:|------|
| `search_posts` | user | 搜索博客文章 |
| `list_posts` | user | 获取文章列表 |
| `get_post` | user | 获取文章详情 |
| `get_post_comments` | user | 获取文章评论 |
| `get_user_profile` | user | 获取用户资料 |
| `get_my_profile` | user | 获取当前用户信息 |
| `get_site_config` | user | 获取站点配置 |
| `create_comment` | user | 发表评论 |
| `like_target` | user | 点赞文章/评论 |
| `update_my_profile` | user | 修改个人资料 |
| `create_post` | admin | 发布文章 |
| `update_post` | admin | 编辑文章 |
| `delete_post` | admin | 删除文章 |
| `delete_comment` | admin | 删除评论 |
| `list_users` | admin | 用户列表 |
| `set_user_status` | admin | 启用/停用用户 |
| `set_user_role` | owner | 修改用户角色 |
| `delete_user` | owner | 删除用户 |

## 常见问题

### 后端启动报数据库连接失败

确认 `.env` 中 `DATABASE_URL` 的用户名密码与 docker-compose 的 `POSTGRES_USER` / `POSTGRES_PASSWORD` 一致。

### AI Agent 返回错误

- 确认 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 均已正确配置
- 确认 `AGENT_ENABLED=true`（或在 `config.yml` 中 `features.agent: true`）
- 注意 LLM API 的超时设置（代码中默认 120s），部分模型响应较慢

### Docker Hub 拉取超时（国内网络）

配置镜像加速 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
```

或通过 `.env` 的 `POSTGRES_IMAGE` / `PYTHON_IMAGE` / `NODE_IMAGE` 变量指定国内镜像源。

## License

MIT
