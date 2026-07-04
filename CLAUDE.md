# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick commands

```bash
# Start the full stack (Postgres, backend, frontend)
docker compose up -d

# Backend tests (only 2 test files, schema + auth security)
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

# User management CLI (via Docker)
docker compose exec backend python manage.py list-users
docker compose exec backend python manage.py promote <username>
docker compose exec backend python manage.py demote <username>
docker compose exec backend python manage.py enable <username>
docker compose exec backend python manage.py disable <username>
docker compose exec backend python manage.py delete <username>
# Or use the wrapper script:
./manage.sh list-users

# Sync deploy config files to server
./deploy.sh
```

- Backend API: `http://localhost:7000`, OpenAPI docs: `http://localhost:7000/docs`
- Frontend: `http://localhost:5173`

## Architecture

**Backend** (FastAPI + SQLAlchemy 2.x mapped_column style with sync engine + Alembic + PostgreSQL):

The backend follows a layered pattern with strict separation:
- `app/api/v1/` — HTTP route handlers. Each file defines a `router` with `prefix` and `tags`. Routes call service functions, never interact with models/db directly. All sub-routers are collected into `api_router` in `app/api/v1/router.py`. Modules: `auth.py`, `users.py`, `posts.py`, `comments.py`, `likes.py`, `admin.py`, `agent.py`.
- `app/api/deps.py` — FastAPI dependency injection. `get_current_user` reads JWT from `access_token` httpOnly cookie, decodes it, checks token blacklist, returns the `User` ORM object (or 401). `get_optional_user` returns None for guests. `require_admin` checks admin/owner role. `verify_mcp_key` validates `X-API-Key` header for MCP server access. `_apply_owner_role` promotes the user whose id matches `SITE_OWNER` env var to OWNER role in memory (not persisted to DB — prevents tampering).
- `app/services/` — Business logic layer. Functions receive a `db: Session` plus DTOs/models, perform authorization checks (e.g., "only the author can edit"), and commit transactions. They raise `HTTPException` directly. Includes `auth_service.py` (token blacklist/cleanup), `github_auth.py` (OAuth code exchange + user creation), and `agent.py` (AI tool-calling loop).
- `app/models/` — SQLAlchemy 2.x mapped_column style ORM models: `User`, `Post`, `Comment`, `Like`, `TokenBlacklist`. The `Like` model uses a polymorphic association pattern with `(user_id, target_type, target_id)` unique constraint to support liking both posts and comments from a single table. `Comment` uses a self-referential `parent_id` for nested replies, plus `profile_id` (nullable) for profile-page comments. Posts use `ARRAY(String)` for tags.
- `app/schemas/` — Pydantic v2 models for request/response shapes. All response schemas inherit from `ORMModel` (which sets `from_attributes=True`). `common.py` defines the base `ORMModel` and `Message` types.
- `app/core/config.py` — Settings via `pydantic-settings`. **Configuration is layered**: `.env` values override `config.yml` values, which override code defaults. `_load_config_yml()` reads `config.yml` from repo root (or `CONFIG_PATH` env var), `_build_defaults()` maps YAML sections to field defaults, and `__init__` applies YAML defaults only for fields not overridden by `.env`. Cached via `@lru_cache` on `get_settings()`.
- `app/core/roles.py` — Five-level role hierarchy: `GUEST < USER < MODERATOR < ADMIN < OWNER`. Role checks are enforced in service layer and deps.
- `app/core/limiter.py` — slowapi rate limiter instance (keyed by remote address). Applied to login (5/min) and register (3/min) endpoints, configurable via `config.yml` auth section.
- `app/db/session.py` — Creates the SQLAlchemy sync `engine` and `SessionLocal` factory. `get_db()` is the FastAPI dependency that yields a session and closes it. `app/db/base.py` imports all models so `Base.metadata` is complete for Alembic.
- `app/utils/security.py` — bcrypt password hashing (`passlib`) and JWT encode/decode (`python-jose`). Dual-token system: access token (short-lived, default 15 min) and refresh token (long-lived, default 7 days). Each token carries `{"sub": user_id_str, "type": "access"|"refresh", "jti": uuid}`.
- `app/utils/cookies.py` — Sets/clears httpOnly, Secure, SameSite cookies for access_token and refresh_token.
- `app/utils/email.py` — Sends verification emails via SMTP (falls back to console print if SMTP not configured).
- `app/utils/html_sanitizer.py` — Sanitizes comment HTML via `nh3` library (allowlist: strong, em, s, del, code, a, br, p, b, i).
- `app/main.py` — FastAPI app creation, CORS middleware, slowapi limiter, route mounting at the `api_prefix` (default `/api`), `/health` endpoint, `/api/config` public site-config endpoint.
- `alembic/` — Migration tooling. `env.py` imports `Base` from `app.db.base` and overrides `sqlalchemy.url` from `get_settings().database_url`.
- `manage.py` — CLI admin tool for user management (promote/demote/enable/disable/delete/list-users). Run via `docker compose exec backend python manage.py <command>`.

**Auth flow** (JWT dual-token via httpOnly cookies, NOT Bearer headers):
1. `POST /api/auth/register` → creates user, sends verification email if feature enabled
2. `POST /api/auth/login` (accepts username/nickname/email + password) → sets `access_token` + `refresh_token` httpOnly cookies
3. Frontend Axios client sends `withCredentials: true` — cookies travel automatically
4. `get_current_user` reads cookie, decodes JWT, checks blacklist, returns User
5. On 401, Axios response interceptor calls `POST /api/auth/refresh` → server issues new access token, blacklists old refresh token
6. `POST /api/auth/logout` → blacklists both tokens, clears cookies
7. GitHub OAuth: `GET /api/auth/github` → redirect to GitHub → callback `GET /api/auth/github/callback` → creates/links user, sets cookies. New GitHub users get a placeholder email; frontend prompts them to set a password.

**AI Agent** (`app/services/agent.py` and `app/api/v1/agent.py`):
- Uses `httpx` to call any OpenAI-compatible API (configurable via `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`)
- 18 registered tools with role-based access filtering (e.g., `delete_user` only available to owner, `create_comment` to user+)
- Multi-turn tool-calling loop: max 6 turns, 120s timeout
- Dynamic system prompt: injects current page context (home → browse posts, post detail → summarize article, etc.)
- Gated by `AGENT_ENABLED` env var / `features.agent` in config.yml
- MCP Server support: external clients can call tools via `X-API-Key` header (separate keys per role: `MCP_KEY_OWNER/ADMIN/USER`)

**Comment system**: Supports three contexts — article comments (`post_id`), profile comments (`profile_id`), and nested replies (`parent_id` self-referential FK). The `reply_to_user_id` and `reply_preview` fields enable reply notifications. Comments are returned as a tree via `build_comment_tree()` in the service layer, with recursive `replies` in the Pydantic schema. All comment content is HTML-sanitized via `nh3` on write.

**Frontend** (React 18 + TypeScript + Vite + Ant Design 5):

- `src/api/client.ts` — Axios instance with base URL from `VITE_API_BASE_URL` env var (defaults to `/api`). `withCredentials: true` so httpOnly auth cookies are sent. Response interceptor handles 401: calls `/auth/refresh`, queues concurrent requests during refresh, retries on success.
- `src/hooks/useAuth.tsx` — `AuthProvider` context. On mount, calls `GET /api/users/me` to validate stored token and populate `user` state. Exposes `user`, `loading`, `refresh`, `logout`.
- `src/router/index.tsx` — React Router v7 routes. `ProtectedRoute` checks auth; unauthenticated users redirect to `/login`. `AdminRoute` checks admin/owner role. Authenticated routes render inside `AppLayout`.
- `src/components/ProtectedRoute.tsx` — Shows a fullscreen spinner while `loading` is true, then either renders `<Outlet />` or redirects.
- `src/components/AgentChat.tsx` — Draggable AI chat panel. Listens to `toggle-agent-chat` custom event (triggered by Live2D mascot menu or FAB). Sends `POST /api/agent` with message and current page context.
- `src/pages/` — Page components: `HomePage`, `LoginPage`, `PostListPage`, `PostDetailPage`, `PostEditorPage`, `UserProfilePage`, `CategoryPage`, `SearchPage`, `AboutPage`, `AdminUsersPage`, `VerifyEmailPage`.
- `src/layouts/AppLayout.tsx` — Header with nav, user menu, search modal, password setup modal (for GitHub OAuth users), draggable new-post FAB, AgentChat, Live2D mascot, footer.
- `src/types/index.ts` — TypeScript interfaces matching API response shapes.
- `src/api/` — Per-resource API modules (`auth.ts`, `posts.ts`, `comments.ts`, `likes.ts`, `users.ts`, `admin.ts`, `config.ts`) wrapping the shared Axios client.
- Vite dev server proxies `/api` requests to `http://localhost:7000` (bypasses `/api/about/` routes which go to the about-writer dev plugin). The about-writer plugin handles `POST /api/about/write` to write `src/data/about.ts` on the fly.
- `src/styles.css` — 1220+ lines of custom CSS with CSS custom properties for theming, responsive three-column grid, homepage hero animation, comment tree indentation, mobile breakpoints.

**Infrastructure** (Docker Compose):

Three services in `docker-compose.yml` (local dev): `postgres` (16-alpine, healthcheck, named volume), `backend` (Python 3.12, source-mounted for hot reload, runs `alembic upgrade head` then uvicorn on port 7000), `frontend` (Node 22, source-mounted with anonymous volume for node_modules, runs `npm run dev` on port 5173). Image tags overridable via `.env` (`POSTGRES_IMAGE`, `PYTHON_IMAGE`, `NODE_IMAGE`).

Production deployment uses `deploy/docker-compose.yml` (no frontend service — frontend is static files on CDN/GitHub Pages). CI/CD via `.github/workflows/deploy.yml`: push to `main` triggers parallel frontend (build + deploy to GitHub Pages) and backend (Docker build + push to ACR + SSH into server to pull and restart).

## Configuration

**Layered settings** (highest to lowest priority):
1. `.env` file at repo root — secrets and overrides (gitignored)
2. `config.yml` at repo root — public site configuration (git-tracked)
3. Code defaults in `app/core/config.py`

The `config.yml` sections: `site`, `server`, `database`, `auth` (JWT expiry, cookie security, rate limits), `email`, `frontend` (URL, CORS origins), `theme` (Ant Design primary color, border radius), `home`, `github` (OAuth client_id, redirect_uri), `features` (toggles for email_verification, comments, likes, agent, mcp).

Key `.env` variables: `DATABASE_URL`, `SECRET_KEY`, `SITE_OWNER` (user ID promoted to owner in memory), `SMTP_USER/PASSWORD/FROM_EMAIL`, `GITHUB_CLIENT_SECRET`, `LLM_API_KEY/BASE_URL/MODEL`, `AGENT_ENABLED`, `MCP_KEY_OWNER/ADMIN/USER`, `BACKEND_IMAGE` (production), `POSTGRES_USER/PASSWORD/DB`.

See `.env.example` for the complete template with descriptions.
