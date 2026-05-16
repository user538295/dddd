# Phase 03: PR Size

Status: Draft
Last updated: 2026-05-16

UI reference: [PR Cycle Time, First Review, and PR Size](../../Assets/mockups/05-pr-cycle-time-first-review-and-pr-size.png).

![PR Cycle Time, First Review, and PR Size](../../Assets/mockups/05-pr-cycle-time-first-review-and-pr-size.png)

## Goal

Add PR Size so the dashboard can detect oversized PR patterns.

## UI Changes

- Add a **PR Size** section below the First Review Time section on the same one-page dashboard.
- Add PR Size metric card.
- Add oversized PR exceptions.
- Add 8-week PR Size trend.
- Add separate Size team breakdown.
- Show median PR size, not only maximum PR size.
- Preserve the PR Cycle Time and First Review Time sections above PR Size; do not move Phase 03 content into the first viewport.

## One-page layout rule

Phase 03 follows the project-wide one-page scroll pattern:

1. PR Cycle Time remains first.
2. First Review Time remains second.
3. PR Size is appended below First Review Time as the next scroll section.

Future metric mockups must follow the same pattern: keep existing metric sections in order and add the next metric after the last section.

## Data

Required data:

- Lines added and deleted per PR.
- File count per PR.
- Repository and team mapping.

## Acceptance Criteria

- PR Size appears only after size data is collected.
- Oversized PR exceptions are deterministic.
- The UI does not shame individual authors.
