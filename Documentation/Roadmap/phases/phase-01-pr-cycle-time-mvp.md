# Phase 01: PR Cycle Time MVP

Status: Draft
Last updated: 2026-05-13

Implementation plan: [FEAT-001 — PR Cycle Time MVP](FEAT-001-pr-cycle-time-mvp-implementation-plan.md)

## Goal

Release the first local dashboard with one metric: PR Cycle Time.

PR Cycle Time is measured from PR opened to PR merged.

## UI

Use this mockup as the current implementation reference:

![PR Cycle Time first increment](../../Assets/mockups/03-pr-cycle-time-first-increment.png)

The UI includes:

- Header with product name, range selector, local data status, and refresh button.
- One primary metric card: Median PR Cycle Time.
- PR Cycle Time exceptions only.
- 8-week PR Cycle Time trend.
- Team breakdown for PR Cycle Time only.
- Data freshness strip.

## Data

Required data:

- Local repository list from `/Users/manczg/Documents/work/development`.
- GitHub PR opened timestamp.
- GitHub PR merged timestamp.
- Repository-to-team mapping.
- Sync timestamp and sync error state.

## Implementation Notes

- Use a separate Node collector for filesystem, Git, and GitHub metadata work.
- Store normalized data locally in SQLite-compatible tables.
- Keep the dashboard driven by computed metrics, not static UI slots.
- Do not add Jira metrics in this phase.

## Acceptance Criteria

- The app scans cloned repositories.
- The app syncs PR lifecycle metadata.
- The app computes median PR Cycle Time for the selected range.
- The app compares against the previous range when enough data exists.
- The dashboard renders exactly one metric.
- Missing baseline shows `Baseline pending`.
- No future metric cards are visible.
