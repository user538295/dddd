#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
unset NO_COLOR

if [[ "${DASHBOARD_E2E_REFRESH_STUB:-}" == "1" ]]; then
  echo "Live e2e must not run with DASHBOARD_E2E_REFRESH_STUB=1" >&2
  exit 1
fi

for key in DATABASE_URL GITHUB_TOKEN DASHBOARD_REPO_ROOT TEAM_MAPPING_PATH; do
  if [[ -z "${!key:-}" ]]; then
    echo "Live e2e requires ${key}" >&2
    exit 1
  fi
done

npm run db:migrate
exec npm run dev -- --host 127.0.0.1 --port "${PORT:-3001}"
