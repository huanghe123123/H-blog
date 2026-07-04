#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── 加载目标服务器信息 ──────────────────────────────────────────────
ENV_FILE="$ROOT/deploy/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "错误：找不到 $ENV_FILE"
  echo "请创建 deploy/.env，填入 DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY"
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

SSH_KEY="${DEPLOY_SSH_KEY:-~/.ssh/id_rsa}"
TARGET_DIR="${TARGET_DIR:-/opt/blog}"
BRANCH="$(git branch --show-current)"

# ── 同步配置文件 ────────────────────────────────────────────────────
echo ">>> 同步配置文件到 $DEPLOY_HOST ..."
scp -i "$SSH_KEY" deploy/config.yml  "${DEPLOY_USER}@${DEPLOY_HOST}:${TARGET_DIR}/config.yml"
scp -i "$SSH_KEY" deploy/docker-compose.yml "${DEPLOY_USER}@${DEPLOY_HOST}:${TARGET_DIR}/docker-compose.yml"

# ── 触发 CI ─────────────────────────────────────────────────────────
echo ">>> 推送 $BRANCH 分支触发 GitHub Actions ..."
git push origin "$BRANCH"

echo ">>> 完成"
