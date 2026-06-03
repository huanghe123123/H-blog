# huanghe123123's blog MVP

一个生产级结构的技术博客平台 MVP：FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL 后端，React + TypeScript + Vite + Ant Design 前端。

## 设计思路

后端采用分层结构：`api` 负责 HTTP 入参和响应，`services` 承载业务规则，`models` 定义数据库实体，`schemas` 定义 Pydantic v2 DTO，`core` 和 `db` 管理配置与会话。认证使用 bcrypt 哈希密码和 JWT Bearer Token。

前端采用 Context + Hooks 管理认证状态，Axios 统一处理 API 和 token，React Router 管理页面。文章内容以 Markdown 原文保存，前端使用 `@uiw/react-md-editor` 编辑与渲染。

点赞采用统一 `likes` 表，通过 `(user_id, target_type, target_id)` 唯一约束保证同一用户不能重复点赞文章或评论。

## 目录结构

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── router/
│   │   ├── utils/
│   │   ├── types/
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## 运行步骤

```bash
docker compose up -d
```

如果 Docker Hub 拉取 `postgres:16-alpine`、`python:3.12-slim` 或 `node:22-alpine` 超时，可以复制环境变量模板并把镜像改成你网络可访问的镜像地址：

```bash
cp .env.example .env
```

例如：

```env
POSTGRES_IMAGE=docker.m.daocloud.io/library/postgres:16-alpine
PYTHON_IMAGE=docker.m.daocloud.io/library/python:3.12-slim
NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine
```

修改后重新执行：

```bash
docker compose build
docker compose up -d
```

访问：

- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- OpenAPI 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

## 数据库迁移命令

容器启动时后端会自动执行：

```bash
alembic upgrade head
```

手动执行：

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "your migration"
```

## 接口测试方法

注册：

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"password123"}'
```

登录：

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"password123"}'
```

创建文章：

```bash
TOKEN="粘贴登录接口返回的 access_token"
curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"第一篇文章","summary":"MVP 摘要","content":"# Hello Markdown","cover_url":"","status":"published"}'
```

搜索文章：

```bash
curl "http://localhost:8000/api/posts/search?keyword=Hello"
```

发表评论：

```bash
curl -X POST http://localhost:8000/api/posts/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"写得不错"}'
```

点赞文章：

```bash
curl -X POST http://localhost:8000/api/likes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'
```

取消点赞：

```bash
curl -X DELETE http://localhost:8000/api/likes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"post","target_id":1}'
```

## 本地测试

后端：

```bash
cd backend
pip install -r requirements.txt
pytest
```

前端：

```bash
cd frontend
npm install
npm run build
```
