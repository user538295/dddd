# Developer guide

Status: Draft  
Last updated: 2026-05-14

This document is for engineers working on the **Data Driven Decision Dashboard** codebase. Product direction and phased scope live under [Documentation/README.md](../README.md) and the [FEAT-001 implementation plan](../Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md).

## Prerequisites

- **Node.js** 20 LTS or newer (the stack uses Vite 8 and modern ESM).
- **npm** (package manager for this repo).
- For the full Phase 01 MVP: **PostgreSQL** and environment configuration as described in [Local onboarding](../Setup/local-onboarding.md).

## Stack (Phase 01 scaffold)

| Area        | Choice                          |
| ----------- | ------------------------------- |
| App runtime | TanStack Start (React, TypeScript) |
| Bundler     | Vite 8                          |
| Unit / component tests | Vitest, React Testing Library, jsdom |
| E2E         | Playwright (`tests/e2e/`)       |
| Lint        | ESLint 9 (flat config)          |

Application source lives under **`src/`** (routes, router, generated `routeTree.gen.ts`). Tests live under **`tests/`**.

## First-time setup

```bash
git clone <repository-url>
cd dddd
npm install
```

For a local database with **Docker**: `./scripts/dev-up.sh` (same as `npm run stack:up`), then `npm run dev`. For Homebrew or other Postgres setups, see [Local onboarding](../Setup/local-onboarding.md).

Copy `config/team-mapping.example.json` → `config/team-mapping.json` when you work on discovery or sync features that need team mapping.

The current app shell does not require `.env` to start the dev server; database and collector features will.

## npm scripts

| Script        | Purpose |
| ------------- | ------- |
| `npm run dev` | Start the Vite dev server (default **http://localhost:3000**). |
| `npm run build` | Production client + SSR build, then `tsc --noEmit`. |
| `npm run test` | Run all Vitest tests once (`vitest run`). |
| `npm run test -- tests/app/app-shell.test.tsx` | Run a single test file (example). |
| `npm run test:e2e` | Run Playwright tests (`--pass-with-no-tests` until e2e specs exist). |
| `npm run lint` | ESLint with **zero warnings** allowed. |
| `npm run typecheck` | TypeScript check without emit. |
| `npm run stack:up` | Same as `./scripts/dev-up.sh` — install deps, `.env`, Postgres, migrations. |
| `npm run stack:down` | Same as `./scripts/dev-down.sh` — stop Compose Postgres. |
| `npm run db:up` | Start local Postgres via Docker Compose (`--wait` until healthy). |
| `npm run db:down` | Stop the Compose Postgres service (named volume keeps data). |
| `npm run db:migrate` | Apply SQL migrations from `drizzle/` (requires `DATABASE_URL`). |

Collector and other CLI scripts are added in later FEAT-001 tasks; see the implementation plan for checkpoints.

## Testing conventions

- Prefer **tests first** for new behaviour (see the implementation plan per task).
- **Unit / component**: Vitest + Testing Library; shared DOM matchers are loaded from **`tests/setup.ts`**.
- **E2E**: Playwright configuration is **`playwright.config.ts`** at the repo root; specs go under **`tests/e2e/`**.

## Useful links

- [Local onboarding](../Setup/local-onboarding.md) — `DATABASE_URL`, repo root, GitHub token, team mapping.
- [GitHub token setup](../Setup/github-token.md).
- [Trackable roadmap checklist](../Roadmap/trackable-roadmap.md) — execution status vs phases.
