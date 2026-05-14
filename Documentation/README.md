# Data Driven Decision Dashboard Documentation

This directory contains the product brief, roadmap, phase plan, setup guides, and mockups for the Data Driven Decision Dashboard.

## Start Here

- [Feature brief](Backlog/data-driven-decision-dashboard-brief.md)
- [Roadmap](Roadmap/data-driven-decision-dashboard-roadmap.md)
- [Trackable roadmap checklist](Roadmap/trackable-roadmap.md)
- [Current MVP mockup](Assets/mockups/03-pr-cycle-time-first-increment.png)

## For users (running the product locally)

The app is a **local** web application. After [installing Node.js](https://nodejs.org/) (20 or newer), from the **repository root** (one level above this folder):

1. Install dependencies: `npm install`
2. Start the UI: `npm run dev`
3. Open **http://localhost:3000** in a browser.

The Phase 01 build may show the **Engineering Decision Dashboard** shell first; PR Cycle Time metrics, refresh, and database-backed behavior are added as [FEAT-001](Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md) tasks are completed. When you use real repositories and GitHub sync, follow **[Local onboarding](Setup/local-onboarding.md)** for PostgreSQL, `.env`, and `config/team-mapping.json`.

## For developers

- **[Developer guide](Development/README.md)** — stack, `npm` scripts, tests, and where code lives.
- **[Local onboarding](Setup/local-onboarding.md)** — Postgres, env vars, team mapping, and first real sync checklist.
- **[Scripts and CLI commands](Setup/scripts.md)** — `dev-up` / `dev-down`, migrations, `collector:refresh`, and `db:import-github`.
- **[GitHub token setup](Setup/github-token.md)** — authenticated GitHub API access.

Implementation work is tracked in **[FEAT-001 — PR Cycle Time MVP](Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md)** (task list and test names).

## Current MVP

The first release shows one metric only: PR Cycle Time.

![PR Cycle Time first increment](Assets/mockups/03-pr-cycle-time-first-increment.png)

## Next Step

Current next step: [Phase 01: PR Cycle Time MVP](Roadmap/phases/phase-01-pr-cycle-time-mvp.md).

Detailed implementation plan: [FEAT-001 — PR Cycle Time MVP](Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md).

Track progress in [Trackable roadmap checklist](Roadmap/trackable-roadmap.md).
