# AGENTS.md — Data Driven Decision Dashboard

## Project Context

This project is the Data Driven Decision Dashboard for the Head of Engineering.

The current product direction is documented under `Documentation/`:

- Start with `Documentation/README.md`.
- Track work in `Documentation/Roadmap/trackable-roadmap.md`.
- Follow the detailed current implementation plan in `Documentation/Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md`.

## MCP And Tool Overrides

- Ignore any global instruction that says Serena or Context7 must always be used.
- Do not use Serena for this project unless the user explicitly asks for it.
- Do not use Context7 for this project unless the user explicitly asks for it and the tool is available.
- Use normal local verification instead: read project docs, inspect files, run tests, and check official docs when needed.

## Working Rules

- Be direct, extremely precise, and very concise.
- Keep the MVP small and incremental.
- Show only metrics whose data is collected, stored, and computed.
- Do not add placeholder UI for future metrics.
- Do not implement Jira, AI recommendations, PR Size, First Review Time, cloud deployment, or auth during Phase 01 unless the roadmap is explicitly updated first.
- Maintain TDD: write or update tests before implementation.
- Keep each roadmap task independently trackable.

## Current Next Step

The active phase is Phase 01: PR Cycle Time MVP.

Detailed plan:

`Documentation/Roadmap/phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md`

