# Data Driven Decision Dashboard

Local-first engineering dashboard for leadership. Phase 01 ships a single metric: **PR Cycle Time** (PR opened → merged), backed by local Git discovery and GitHub metadata sync.

## Documentation

- **[Documentation index](Documentation/README.md)** — product context, mockups, and where to read next.
- **[Local onboarding](Documentation/Setup/local-onboarding.md)** — PostgreSQL, environment variables, team mapping, and repository layout.
- **[Scripts and CLI](Documentation/Setup/scripts.md)** — stack scripts, migrations, collector refresh, and GitHub import.
- **[Developer guide](Documentation/Development/README.md)** — stack, scripts, and how to run tests and builds.

## Quick start

Requires a recent **Node.js** (20+) and **Docker** (Compose v2). From the repository root:

```bash
./scripts/dev.sh
```

Starts Postgres, applies migrations, and launches the Vite dev server. **Ctrl+C** stops the frontend and tears down Postgres. Open **http://localhost:3000**.

Full setup (GitHub token, team mapping) is in [Local onboarding](Documentation/Setup/local-onboarding.md).
