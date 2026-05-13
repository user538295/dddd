# Phase 04: Jira Flow Metrics

Status: Draft
Last updated: 2026-05-09

## Goal

Add Jira-backed flow metrics after GitHub PR metrics are stable.

## Metrics

- WIP.
- Throughput.
- Jira cycle time.
- Missing Jira key hygiene.

## UI Changes

- Add metric cards only for implemented Jira metrics.
- Add Jira data freshness.
- Add Jira-related data-quality issues.
- Keep PR metrics visible.

## Data

Required data:

- Jira issues.
- Status history.
- Sprint or timebox metadata if available.
- Jira issue keys linked to PRs.

## Acceptance Criteria

- Jira metrics do not appear until sync and computation are implemented.
- WIP reflects active Jira work, not GitHub PR count.
- Missing Jira key count is shown as a data-quality issue.

