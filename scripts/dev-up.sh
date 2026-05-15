#!/usr/bin/env bash
# Set up local dependencies, start Postgres (Docker Compose), apply migrations.
# Does not start the Vite dev server — run: npm run dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker not found. Install Docker Desktop and ensure it is running." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "error: 'docker compose' not available. Use Docker Compose v2." >&2
  exit 1
fi

echo "==> npm install"
npm install

if [[ ! -f .env ]]; then
  echo "==> creating .env from .env.example"
  cp .env.example .env
fi

echo "==> loading .env"
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is empty after sourcing .env. Set it in .env (see .env.example)." >&2
  exit 1
fi

# Phase 01 uses PostgreSQL; older local .env files may still point at SQLite.
if [[ "${DATABASE_URL}" == file:* ]] || [[ "${DATABASE_URL}" == sqlite:* ]]; then
  pg_url='postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_dev'
  echo "==> upgrading stale DATABASE_URL in .env (PostgreSQL via Docker Compose)"
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${pg_url}|" .env
  else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${pg_url}|" .env
  fi
  export DATABASE_URL="${pg_url}"
fi

echo "==> docker compose up (Postgres, wait for healthy)"
docker compose up -d --wait

echo "==> db:migrate"
npm run db:migrate

echo ""
echo "Local stack is ready."
echo "  - Postgres: DATABASE_URL from .env (Compose default: port 54332)"
echo "  - Dashboard: npm run dev"
echo "Stop Postgres: ./scripts/dev-down.sh   (or: npm run stack:down)"
