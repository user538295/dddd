#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "${ROOT}/.tmp/e2e-empty-repo-root"
export DASHBOARD_E2E_REFRESH_STUB="${DASHBOARD_E2E_REFRESH_STUB:-1}"
export DASHBOARD_ALLOW_E2E_REFRESH_STUB=1
export DASHBOARD_REPO_ROOT="${DASHBOARD_REPO_ROOT:-${ROOT}/.tmp/e2e-empty-repo-root}"
export TEAM_MAPPING_PATH="${TEAM_MAPPING_PATH:-${ROOT}/config/team-mapping.example.json}"
export DATABASE_URL="${DATABASE_URL:-${TEST_DATABASE_URL:-postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_test}}"
npm run db:ensure
npm run db:migrate
exec npm run dev -- --host 127.0.0.1 --port "${DASHBOARD_E2E_PORT:-3000}"
