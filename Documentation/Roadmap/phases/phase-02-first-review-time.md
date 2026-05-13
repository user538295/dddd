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

## Acceptance Criteria

- First Review Time appears only after review data is synced and computed.
- Exceptions identify teams with worsening review latency.
- PR Cycle Time UI continues to work unchanged.

