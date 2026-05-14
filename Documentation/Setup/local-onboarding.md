# Local Onboarding

Status: Draft
Last updated: 2026-05-14

## Purpose

This guide prepares the local configuration needed to run the PR Cycle Time MVP against real repositories.

## Web application (UI)

The dashboard runs as a **TanStack Start** app on **Vite** (dev server default **http://localhost:3000**).

1. Install [Node.js](https://nodejs.org/) 20 or newer and clone this repository.
2. From the repository root: `npm install`, then `npm run dev`.
3. For day-to-day engineering commands (tests, lint, build), see **[Developer guide](../Development/README.md)**.

The current Phase 01 scaffold may start **without** `.env` for UI-only work. **PostgreSQL** and `.env` (see below) are required once database migrations, the collector, and server functions are in use.

## PostgreSQL (required)

Phase 01 stores dashboard and sync data in **PostgreSQL** on your machine (or in Docker).

### Quick path: Docker Compose (recommended)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or another engine with Compose v2).
2. From the repository root: **`./scripts/dev-up.sh`** (runs `npm install`, creates `.env` from `.env.example` if missing, starts Postgres, runs migrations) — or manually: `npm run db:up`, copy `.env.example` → `.env`, then `npm run db:migrate`.
3. Start the app: `npm run dev`.

The default `DATABASE_URL` in `.env.example` matches Compose (`postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_dev`). **Change the Compose password** in `docker-compose.yml` and `.env` if anything beyond localhost can reach host port **54332**.

4. Stop Postgres when finished: **`./scripts/dev-down.sh`** (or `npm run stack:down`). The container stops; data stays in the Docker volume until you remove it (see script output for the volume name).

Vitest loads `.env` from the repo root when `DATABASE_URL` is not already set in the shell, so `npm run test` can run database integration tests after the steps above.

### Manual install (Homebrew, Postgres.app, or your own server)

1. Install PostgreSQL (e.g. [Homebrew](https://formulae.brew.sh/formula/postgresql@16), [Postgres.app](https://postgresapp.com/), or official [Docker image](https://hub.docker.com/_/postgres)).
2. Create a database for this project, for example `dddd_dev`. If you need a dedicated application user, create a login role (`CREATE ROLE ... LOGIN PASSWORD '...'`) and grant it `CONNECT` on the database (and ownership or table privileges as needed for migrations).
3. Ensure the DB user can **connect** to that database (`CONNECT`) and run migrations and app queries—typically `CREATE` on the database (if creating tables as owner), plus `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables (exact `GRANT`s depend on whether migrations use the same role as the app; for solo local dev, making the user **owner** of the database is acceptable).
4. Set `DATABASE_URL` in `.env` to a standard URI, for example:
   `postgresql://USER:PASSWORD@localhost:5432/dddd_dev`
5. Apply database migrations once the URI is set (creates Phase 01 tables and enums):

   ```bash
   npm run db:migrate
   ```

   This uses `drizzle.config.ts` and SQL under `drizzle/`. The same migrations run in integration tests via `runMigrations` in application code.

6. Use TLS and managed hosts when you deploy later; for local dev, `localhost` without SSL is typical.

## Automated tests and CI

Vitest integration tests and Playwright e2e expect a **running PostgreSQL** instance. Easiest local option: `./scripts/dev-up.sh` (or `npm run stack:up`), then `npm run test`. Alternatives: **testcontainers**, a disposable `*_test` database, or CI services that provide Postgres. Do not point tests at production databases.

## Files

- `.env.example` is the tracked template with default values.
- `.env` is the local editable file and is gitignored.
- `docker-compose.yml` defines the optional local Postgres service used by `npm run db:up` and **`./scripts/dev-up.sh`**.
- **`scripts/dev-up.sh`** / **`scripts/dev-down.sh`** — bring the local DB stack up or down (see [PostgreSQL](#postgresql-required)).
- `config/team-mapping.example.json` is the tracked repository/team selection template.
- `config/team-mapping.json` is the local editable config and is gitignored.
- `data/` may hold optional local exports or scratch files; the **database server** holds Postgres data, not files under `data/` by default.

## Default Local Values

```env
DASHBOARD_REPO_ROOT=/Users/manczg/Documents/work/development
DATABASE_URL=postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_dev
TEAM_MAPPING_PATH=./config/team-mapping.json
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_TOKEN=
GITHUB_SYNC_OWNER=gde-mit
DASHBOARD_DEFAULT_RANGE_WEEKS=8
DASHBOARD_INITIAL_SYNC_FROM=2026-01-01
GITHUB_SYNC_CONCURRENCY=2
```

## Repository Selection

The collector discovers immediate child directories of `DASHBOARD_REPO_ROOT` that contain `.git`.

### GitHub org filter

`GITHUB_SYNC_OWNER` (default `gde-mit`) is compared to the GitHub **owner** parsed from `git remote get-url origin`. Repositories whose remote owner does not match are **skipped** for PR sync and dashboard metrics (same outcome as excluded-by-config: stored on scan but not active for metrics). Unparseable remotes stay `metadata_incomplete` as today.

### Team mapping file

After discovery and org filter, `config/team-mapping.json` decides which remaining repositories are synced:

- `includeRepoPatterns` limits the synced set. If omitted, every discovered repository is included.
- `excludeRepoPatterns` removes repositories from sync and metrics.
- `teams[].repoPatterns` maps repositories to teams (first matching team wins; put narrower patterns before broad ones such as `bd-*`).
- `defaultTeam` is used when no team pattern matches.

Example:

```json
{
  "includeRepoPatterns": ["*"],
  "excludeRepoPatterns": ["*-archive", "experiment-*"],
  "defaultTeam": "Unassigned",
  "teams": [
    { "name": "Chat", "repoPatterns": ["nexiusai-hermes", "sd-agentic-chatbot"] },
    { "name": "DPA / Lecke", "repoPatterns": ["sd-dpa", "nexiusai-dpa-*"] },
    { "name": "Platform", "repoPatterns": ["aws-*", "sd-pe-*"] }
  ]
}
```

## First Real Test Checklist

1. Install and start PostgreSQL; create `dddd_dev` (or your chosen DB name) and set `DATABASE_URL` in `.env`.
2. Confirm repositories exist under `/Users/manczg/Documents/work/development`.
3. Edit `.env` and set `GITHUB_TOKEN`.
4. Edit `config/team-mapping.json` to include only the repositories you want to test first.
5. Keep `DASHBOARD_INITIAL_SYNC_FROM=2026-01-01` for the first run unless you need older PR data.
6. Keep `GITHUB_SYNC_CONCURRENCY=2` for the first real run.
7. Start with a small include list, verify the dashboard, then widen the patterns.

## Notes

- A fresh database syncs PRs updated on or after `DASHBOARD_INITIAL_SYNC_FROM`.
- Later refreshes use the stored GitHub update cursor for incremental sync.
- Repositories excluded by patterns, or skipped because `origin` is not under `GITHUB_SYNC_OWNER`, are stored with excluded semantics and are not synced or included in metrics.
- The dashboard range stays independent from sync range. The default dashboard range is the last 8 weeks.
