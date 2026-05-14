# Phase 05: Quality And Cloud Readiness

Status: Draft
Last updated: 2026-05-09

## Goal

Add quality signals and prepare a cloud path after the local dashboard is useful.

## Quality Candidates

- Reopen rate.
- Rework rate.
- Bug escape proxy.
- Change failure rate, only after incident or deployment data exists.

## Cloud Readiness

- Keep PostgreSQL deployment portable (local instance today, managed Postgres later).
- Avoid database-specific assumptions that would block moving from laptop Postgres to managed Postgres.
- Keep collector separate from the web runtime.
- Treat Cloudflare deployment as a later packaging and sync problem, not a blocker for local MVP.

## Acceptance Criteria

- Quality metrics are added only when source data is reliable.
- Cloud migration does not require rewriting metric definitions.
- Local-first workflow remains usable.

