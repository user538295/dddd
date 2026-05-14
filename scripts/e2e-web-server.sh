#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "${ROOT}/.tmp/e2e-empty-repo-root"
export DASHBOARD_E2E_REFRESH_STUB="${DASHBOARD_E2E_REFRESH_STUB:-1}"
export DASHBOARD_REPO_ROOT="${DASHBOARD_REPO_ROOT:-${ROOT}/.tmp/e2e-empty-repo-root}"
export TEAM_MAPPING_PATH="${TEAM_MAPPING_PATH:-${ROOT}/config/team-mapping.example.json}"
npm run db:migrate
exec npm run dev
