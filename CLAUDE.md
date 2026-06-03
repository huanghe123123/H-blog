# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick commands

```bash
# Start the full stack (Postgres, backend, frontend)
docker compose up -d

# Backend tests
cd backend && pip install -r requirements.txt && pytest
# Run a single test
cd backend && pytest tests/test_schemas.py::test_user_register_validation

# Database migrations (via Docker)
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "description"

# Frontend dev server (local, outside Docker)
cd frontend && npm install && npm run dev
# Frontend type-check + build
cd frontend && npm run build
```

- Backend API: `http://localhost:8000`, OpenAPI docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`

## Architecture

**Backend** (FastAPI + SQLAlchemy 2.x async-style ORM with sync engine + Alembic + PostgreSQL):

The backend follows a layered pattern with strict separation:
- `app/api/v1/` — HTTP route handlers. Each file defines a `router` with `prefix` and `tags`. Routes call service functions, never interact with models/db directly. All sub-routers are collected into `api_router` in `app/api/v1/router.py`.
- `app/api/deps.py` — FastAPI dependency injection. `get_current_user` extracts and validates the JWT Bearer token, returns the `User` ORM object (or 401).
- `app/services/` — Business logic layer. Functions receive a `db: Session` plus DTOs/models, perform authorization checks (e.g., "only the author can edit"), and commit transactions. They raise `HTTPException` directly.
- `app/models/` — SQLAlchemy 2.x mapped_column style ORM models. `User`, `Post`, `Comment`, `Like`. The `Like` model uses a polymorphic pattern with `(user_id, target_type, target_id)` unique constraint to support liking both posts and comments from a single table.
- `app/schemas/` — Pydantic v2 models for request/response shapes. All response schemas inherit from `ORMModel` (which sets `from_attributes=True`). `common.py` defines the base `ORMModel` and `Message` types.
- `app/core/config.py` — Settings via `pydantic-settings`, reads from env vars and `.env` file. Cached via `@lru_cache`.
- `app/db/session.py` — Creates the SQLAlchemy `engine` and `SessionLocal` factory. `get_db()` is the FastAPI dependency that yields a session and closes it.
- `app/utils/security.py` — bcrypt password hashing (`passlib`) and JWT encode/decode (`python-jose`). Tokens carry `{"sub": user_id_str}`.
- `app/main.py` — FastAPI app creation, CORS middleware, route mounting at the `api_prefix` (default `/api`), `/health` endpoint.
- `alembic/` — Migration tooling. `env.py` imports `Base` from `app.db.base` (which imports all models so metadata is complete).

Auth flow: `POST /api/auth/register` → `POST /api/auth/login` returns JWT → client stores token → Axios interceptor attaches `Authorization: Bearer` → `get_current_user` decodes and fetches user.

**Frontend** (React 18 + TypeScript + Vite + Ant Design):

- `src/api/client.ts` — Axios instance with base URL from `VITE_API_BASE_URL` env var. Request interceptor attaches JWT from `localStorage`.
- `src/hooks/useAuth.tsx` — `AuthProvider` context. On mount, calls `GET /api/users/me` to validate stored token and populate `user` state. Exposes `user`, `loading`, `refresh`, `logout`.
- `src/router/index.tsx` — React Router v7 routes. `ProtectedRoute` component checks auth; unauthenticated users redirect to `/login`. Authenticated routes render inside `AppLayout`.
- `src/components/ProtectedRoute.tsx` — Shows a fullscreen spinner while `loading` is true, then either renders `<Outlet />` or redirects to `/login`.
- `src/pages/` — Page components: `LoginPage`, `PostListPage`, `PostDetailPage`, `PostEditorPage`, `ProfilePage`.
- `src/types/index.ts` — TypeScript interfaces matching API response shapes.
- `src/api/` — Per-resource API modules (`auth.ts`, `posts.ts`, `comments.ts`, `likes.ts`, `users.ts`) wrapping the shared Axios client.
- Vite dev server proxies `/api` requests to `http://localhost:8000` so the frontend can use relative API paths in development.

**Infrastructure** (Docker Compose):

Three services: `postgres` (16-alpine), `backend` (Python 3.12, runs `alembic upgrade head` then uvicorn), `frontend` (Node 22, runs `npm run dev`). Backend code is volume-mounted for hot reload. Database data persists in a named volume. Image tags can be overridden via `.env` for users behind restrictive firewalls.

## Configuration

- Backend: `backend/.env` (DATABASE_URL, SECRET_KEY, BACKEND_CORS_ORIGINS)
- Frontend: `VITE_API_BASE_URL` env var (defaults to `/api` in Axios, overridden in docker-compose)
- Docker images: `.env` at repo root (POSTGRES_IMAGE, PYTHON_IMAGE, NODE_IMAGE)
