#!/usr/bin/env bash
# Stop Postgres and remove the Compose stack (named volume keeps data).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker not found." >&2
  exit 1
fi

echo "==> docker compose down"
docker compose down

echo ""
echo "Compose stack stopped. Data volume dddd_pgdata is kept until removed with:"
echo "  docker volume rm dddd_dddd_pgdata"
