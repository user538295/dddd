# Trackable Roadmap Checklist

Status: Active
Last updated: 2026-05-13

## How To Use This File

This is the execution checklist for humans and LLM agents.

- Work from top to bottom.
- Only one phase should be active at a time.
- Mark an item as complete only when the related behavior is implemented and verified.
- Use the linked phase file as the detailed source of truth for each phase.
- Do not add UI for a metric until its data is collected, stored, and computed.

## Current Next Step

Next step: **Phase 01: PR Cycle Time MVP**

Detailed file: [phase-01-pr-cycle-time-mvp.md](phases/phase-01-pr-cycle-time-mvp.md)

Implementation plan: [FEAT-001-pr-cycle-time-mvp-implementation-plan.md](phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md)

Current UI reference: [PR Cycle Time first increment](../Assets/mockups/03-pr-cycle-time-first-increment.png)

## Phase 00: Product Refinement And UI

Detailed file: [phase-00-product-refinement-and-ui.md](phases/phase-00-product-refinement-and-ui.md)

- [x] Save product brief.
- [x] Save roadmap.
- [x] Save phase files.
- [x] Save mockups inside the project.
- [x] Mark broad mockups as superseded.
- [x] Mark PR Cycle Time-only mockup as current MVP reference.

## Phase 01: PR Cycle Time MVP

Detailed file: [phase-01-pr-cycle-time-mvp.md](phases/phase-01-pr-cycle-time-mvp.md)

Implementation plan: [FEAT-001-pr-cycle-time-mvp-implementation-plan.md](phases/FEAT-001-pr-cycle-time-mvp-implementation-plan.md)

Goal: release the first local dashboard with one metric: PR Cycle Time.

- [ ] Initialize the local app project.
- [ ] Add local database setup with SQLite-compatible schema.
- [ ] Add repository discovery for `/Users/manczg/Documents/work/development`.
- [ ] Store discovered repositories and scan status.
- [ ] Add repository-to-team mapping config.
- [ ] Add GitHub PR metadata sync for opened and merged timestamps.
- [ ] Store PR lifecycle metadata locally.
- [ ] Compute PR Cycle Time per merged PR.
- [ ] Compute median PR Cycle Time for the selected range.
- [ ] Compute previous-period comparison when enough data exists.
- [ ] Compute PR Cycle Time exceptions.
- [ ] Build the MVP dashboard using only PR Cycle Time.
- [ ] Show data freshness: repos scanned, PR metadata sync time, missing Jira keys, sync errors.
- [ ] Handle empty states: no merged PRs, missing baseline, sync errors.
- [ ] Verify the dashboard renders no future metric cards.
- [ ] Verify the current MVP mockup is still aligned or update the mockup/doc if the UI intentionally changes.

## Phase 02: First Review Time

Detailed file: [phase-02-first-review-time.md](phases/phase-02-first-review-time.md)

Goal: add review-latency visibility after PR Cycle Time is working.

- [ ] Sync GitHub review event metadata.
- [ ] Store first review timestamp per PR.
- [ ] Compute First Review Time.
- [ ] Add First Review metric card.
- [ ] Add review-latency exceptions.
- [ ] Add First Review data to team breakdown.
- [ ] Verify PR Cycle Time behavior remains unchanged.

## Phase 03: PR Size

Detailed file: [phase-03-pr-size.md](phases/phase-03-pr-size.md)

Goal: detect oversized PR patterns.

- [ ] Sync changed-line and file-count metadata per PR.
- [ ] Store PR size metadata locally.
- [ ] Compute median PR size.
- [ ] Add PR Size metric card.
- [ ] Add oversized PR exceptions.
- [ ] Add PR Size data to team breakdown.
- [ ] Verify the UI does not rank or shame individual authors.

## Phase 04: Jira Flow Metrics

Detailed file: [phase-04-jira-flow-metrics.md](phases/phase-04-jira-flow-metrics.md)

Goal: add Jira-backed flow metrics after GitHub PR metrics are stable.

- [ ] Add Jira API configuration.
- [ ] Sync Jira issues.
- [ ] Sync Jira status history.
- [ ] Link Jira issues to PRs by issue key.
- [ ] Compute WIP.
- [ ] Compute throughput.
- [ ] Compute Jira cycle time.
- [ ] Compute missing Jira key hygiene.
- [ ] Add Jira-backed metric cards only after each calculation exists.
- [ ] Add Jira data freshness and data-quality issues.

## Phase 05: Quality And Cloud Readiness

Detailed file: [phase-05-quality-and-cloud-readiness.md](phases/phase-05-quality-and-cloud-readiness.md)

Goal: add quality signals and prepare the cloud path after the local dashboard is useful.

- [ ] Decide first quality source of truth.
- [ ] Add reopen rate if source data is reliable.
- [ ] Add rework rate if source data is reliable.
- [ ] Add bug escape proxy if source data is reliable.
- [ ] Add change failure rate only after incident or deployment data exists.
- [ ] Review database portability for Cloudflare D1 and later Supabase/Postgres.
- [ ] Keep collector separate from deployed runtime assumptions.
- [ ] Document cloud migration options after local MVP proves useful.
