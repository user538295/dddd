#!/usr/bin/env bash
# Start the full local dev stack: backend (Docker/Postgres) + frontend (Vite).
# Ctrl+C stops the frontend and automatically tears down the backend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cleanup() {
  echo ""
  echo "==> shutting down backend..."
  bash "$ROOT/scripts/dev-down.sh"
}
trap cleanup EXIT

bash "$ROOT/scripts/dev-up.sh"

echo ""
echo "==> starting frontend (Ctrl+C to stop everything)"
npm run dev
