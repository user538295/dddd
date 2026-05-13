# Phase 03: PR Size

Status: Draft
Last updated: 2026-05-09

## Goal

Add PR Size so the dashboard can detect oversized PR patterns.

## UI Changes

- Add PR Size metric card.
- Add oversized PR exceptions.
- Add PR Size column to team breakdown.
- Show median PR size, not only maximum PR size.

## Data

Required data:

- Lines added and deleted per PR.
- File count per PR.
- Repository and team mapping.

## Acceptance Criteria

- PR Size appears only after size data is collected.
- Oversized PR exceptions are deterministic.
- The UI does not shame individual authors.

