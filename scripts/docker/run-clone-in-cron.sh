#!/usr/bin/env bash
# Cron wrapper for scripts/docker/clone-github-org-repos.sh.
#
# Cron starts jobs with a minimal env; this wrapper sources the
# container env dump produced by container-entrypoint.sh so GITHUB_TOKEN
# and friends are available, then invokes the clone script. Output is
# tagged with [clone-cron] so it stands out in `docker compose logs`.

set -uo pipefail

if [[ ! -r /etc/container.env ]]; then
  echo "[clone-cron] $(date -Iseconds) FATAL: /etc/container.env missing or unreadable" >&2
  exit 2
fi
# shellcheck disable=SC1091
. /etc/container.env

cd /app

echo "[clone-cron] $(date -Iseconds) starting clone-github-org-repos.sh"
# Tag the inner script's verbose output with the same prefix so a single
# `docker compose logs | grep '[clone-cron]'` catches per-repo progress
# too. pipefail (set above) lets the `if` see the script's exit code
# through the sed pipe.
if bash /app/scripts/docker/clone-github-org-repos.sh 2>&1 | sed 's/^/[clone-cron]   /'; then
  echo "[clone-cron] $(date -Iseconds) finished ok"
else
  rc=$?
  echo "[clone-cron] $(date -Iseconds) finished rc=$rc"
fi
