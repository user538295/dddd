#!/usr/bin/env bash
# Cron wrapper for `npm run collector:refresh`.
#
# Sources /etc/container.env (written by container-entrypoint.sh) so
# DATABASE_URL, GITHUB_TOKEN, DASHBOARD_REPO_ROOT, etc. are populated
# before the collector runs. Output is tagged [refresh-cron] so it
# stands out in `docker compose logs`.

set -uo pipefail

if [[ ! -r /etc/container.env ]]; then
  echo "[refresh-cron] $(date -Iseconds) FATAL: /etc/container.env missing or unreadable" >&2
  exit 2
fi
# shellcheck disable=SC1091
. /etc/container.env

cd /app

echo "[refresh-cron] $(date -Iseconds) starting collector:refresh"
# Tag the inner npm + tsx stdout with the same prefix so `docker compose
# logs | grep '[refresh-cron]'` captures the refresh summary too.
# pipefail (set above) lets the `if` see npm's non-zero exit through sed.
if npm run --silent collector:refresh 2>&1 | sed 's/^/[refresh-cron]   /'; then
  echo "[refresh-cron] $(date -Iseconds) finished ok"
else
  rc=$?
  echo "[refresh-cron] $(date -Iseconds) finished rc=$rc"
fi
