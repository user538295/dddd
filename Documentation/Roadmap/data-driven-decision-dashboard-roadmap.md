# Data Driven Decision Dashboard Roadmap

Status: Draft
Last updated: 2026-05-15

## Strategy

Ship the dashboard metric by metric. Each phase adds one new data capability and only then extends the UI. The product should never show fake placeholders for metrics that are not collected and computed yet.

Current UI reference: [PR Cycle Time and First Review](../Assets/mockups/04-pr-cycle-time-and-first-review.png)

Execution checklist: [Trackable roadmap checklist](trackable-roadmap.md)

Design history:

- [Expanded dashboard concept](../Assets/mockups/01-expanded-dashboard-concept.png) - superseded, too broad for MVP.
- [Seven-metric MVP concept](../Assets/mockups/02-seven-metric-mvp-concept.png) - superseded, still too broad for first release.
- [PR Cycle Time first increment](../Assets/mockups/03-pr-cycle-time-first-increment.png) - Phase 01 reference.
- [PR Cycle Time and First Review](../Assets/mockups/04-pr-cycle-time-and-first-review.png) - Phase 02 reference.

## Phase Roadmap

| Phase | Name | Release Goal |
| --- | --- | --- |
| 00 | Product refinement and UI | Save decisions, mockups, and scope |
| 01 | PR Cycle Time MVP | Release the first useful local dashboard |
| 02 | First Review Time | Add review-latency visibility |
| 03 | PR Size | Add oversized PR detection |
| 04 | Jira Flow Metrics | Add WIP, throughput, and Jira cycle time |
| 05 | Quality and Cloud Readiness | Add quality signals and prepare cloud migration |

## Incremental UI Rule

- Show a metric only when its source data is collected and its calculation exists.
- Hide future metrics entirely.
- Keep data freshness visible at all times.
- Keep exceptions tied only to available metrics.
- Avoid individual performance scoring.

## Phase Links

- [Phase 00: Product refinement and UI](phases/phase-00-product-refinement-and-ui.md)
- [Phase 01: PR Cycle Time MVP](phases/phase-01-pr-cycle-time-mvp.md)
- [Phase 02: First Review Time](phases/phase-02-first-review-time.md)
- [Phase 03: PR Size](phases/phase-03-pr-size.md)
- [Phase 04: Jira Flow Metrics](phases/phase-04-jira-flow-metrics.md)
- [Phase 05: Quality and Cloud Readiness](phases/phase-05-quality-and-cloud-readiness.md)

## Current Priority

Continue with Phase 02. The next release should add GitHub review metadata sync, First Review Time computation, review-latency exceptions, First Review trend, review team columns, and review freshness while preserving the Phase 01 PR Cycle Time behavior.

Track implementation status in [Trackable roadmap checklist](trackable-roadmap.md). The detailed next-step file is [Phase 02: First Review Time](phases/phase-02-first-review-time.md).
