# Dev-mode image: runs `npm run dev` (Vite) inside the container.
FROM node:20-bookworm-slim

# git is needed at runtime: the collector runs `git fetch` against the local
# clones bind-mounted at /repos to compute PR sizes (diff --shortstat on merge
# commits). ca-certificates ensures HTTPS to github.com works.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Credential helper for HTTPS GitHub fetches. Reads $GITHUB_TOKEN from the
# environment at credential-request time (not at config time, because the
# single-quoted snippet is stored literally in git config and expanded by
# the helper shell when git invokes it). Scoped to github.com so it does
# not affect other hosts.
RUN git config --global credential.https://github.com.helper \
    '!f() { test "$1" = get && printf "%s\n" "username=x-access-token" "password=$GITHUB_TOKEN"; }; f'

# If $GITHUB_TOKEN is ever empty or wrong, the credential helper returns
# password=<empty>; without this, git would fall back to an interactive
# prompt on the TTY (which is allocated by `docker compose exec`) and
# the clone loop would hang silently.
ENV GIT_TERMINAL_PROMPT=0

WORKDIR /app

# Install deps first for better layer caching. Use `npm ci` rather than
# `npm install` so the image matches the committed package-lock.json
# exactly, without mutating the lockfile inside the image.
COPY package.json package-lock.json ./
RUN npm ci

# App source is bind-mounted at runtime via docker compose so edits hot-reload.
# We still copy here so the image is usable standalone.
COPY . .

EXPOSE 3000

# Vite is pinned to 127.0.0.1 in vite.config.ts; override to 0.0.0.0 so the
# port is reachable from the host. Migrations run before the dev server
# starts. `exec` replaces the shell with Node so Vite becomes PID 1 and
# receives SIGTERM directly on `docker compose down` — without it, `sh`
# absorbs the signal and the dev server only dies via the 10s grace SIGKILL.
CMD ["sh", "-c", "npm run db:migrate && exec npm run dev -- --host 0.0.0.0"]
