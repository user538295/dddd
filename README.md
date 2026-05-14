# Data Driven Decision Dashboard

Local-first engineering dashboard for leadership. Phase 01 ships a single metric: **PR Cycle Time** (PR opened → merged), backed by local Git discovery and GitHub metadata sync.

## Documentation

- **[Documentation index](Documentation/README.md)** — product context, mockups, and where to read next.
- **[Local onboarding](Documentation/Setup/local-onboarding.md)** — PostgreSQL, environment variables, team mapping, and repository layout.
- **[Scripts and CLI](Documentation/Setup/scripts.md)** — stack scripts, migrations, collector refresh, and GitHub import.
- **[Developer guide](Documentation/Development/README.md)** — stack, scripts, and how to run tests and builds.

## Quick start (app shell)

Requires a recent **Node.js** (20+). From the repository root:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The Phase 01 scaffold shows the **Engineering Decision Dashboard** title; metrics and sync behavior are added per the [implementation plan](Documentation/Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md).

Full MVP setup (database, GitHub token, team mapping) is in [Local onboarding](Documentation/Setup/local-onboarding.md).
