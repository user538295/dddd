# Phase 02: First Review Time

Status: Draft
Last updated: 2026-05-09

## Goal

Add review latency after PR Cycle Time is working.

First Review Time is measured from PR opened to first review.

## UI Changes

- Add a First Review metric card.
- Add review-latency exceptions.
- Add First Review column to team breakdown.
- Add trend line only when enough history exists.

## Data

Required data:

- PR opened timestamp.
- First review timestamp.
- Review event metadata from GitHub.
- PR review participation metadata (reviewer count and review comments) to flag likely merge-without-review patterns.

## Acceptance Criteria

- First Review Time appears only after review data is synced and computed.
- Exceptions identify teams with worsening review latency.
- PR Cycle Time UI continues to work unchanged.
- Dashboard or exceptions can highlight merged PRs with **0 reviewers and 0 review comments** (especially when PR open→merge time is very short), so instant merges are visible as a process signal alongside cycle time.

