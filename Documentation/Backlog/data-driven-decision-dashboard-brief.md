# Feature Brief: Data Driven Decision Dashboard

Status: Draft
Last updated: 2026-05-09

## Problem

The Head of Engineering needs a fast weekly view of engineering delivery health across many repositories, without waiting for manual reporting or reading disconnected Jira and GitHub dashboards.

## Goal

Release a local-first dashboard that starts with one useful metric, then grows incrementally as new data is collected and computed. The first release measures PR Cycle Time only.

## Users & Context

Primary user: Head of Engineering at a roughly 100-person company.

The dashboard is used during weekly engineering review to answer:

- What changed this week?
- Which teams or repositories need attention?
- Is the metric trustworthy enough to act on?
- What should be improved next?

## Core Flow

1. The user opens the local dashboard.
2. The user clicks `Refresh`.
3. The local collector scans cloned repositories under `/Users/manczg/Documents/work/development`.
4. The collector enriches Git data with minimal GitHub PR metadata when local Git history is insufficient.
5. The app stores normalized metric data locally.
6. The dashboard shows only metrics that have been collected and computed.
7. The user reviews PR Cycle Time, exceptions, trend, team breakdown, and data freshness.

## In Scope

- Local-first web app.
- First metric: PR Cycle Time, measured from PR opened to PR merged.
- Repository discovery from cloned Git repositories.
- Minimal GitHub metadata sync for PR lifecycle data.
- Local **PostgreSQL** storage (same machine as the dashboard; Drizzle ORM).
- Current MVP UI reference: [PR Cycle Time first increment](../Assets/mockups/03-pr-cycle-time-first-increment.png).
- Incremental UI rule: show only available computed metrics.

## Out of Scope

- Jira flow metrics in the first release, because they require Jira sync and workflow-history modeling.
- AI recommendations in v1, because deterministic rules are enough until metric trust is established.
- Individual engineer ranking, because the product is for leadership decisions, not performance surveillance.
- Deployment, incidents, and true DORA quality metrics, because those require additional data sources.
- Cloud deployment in the first release, because the product should be useful locally first.

## Key Decisions

- Use a local-first architecture so the first version can run on the user's computer.
- Use a metric-by-metric release strategy to ship ASAP.
- Start with PR Cycle Time because it is valuable, simple, and does not require Jira workflow cleanup.
- Use local cloned repos for Git history because there are many repositories and they already exist locally.
- Use minimal GitHub API access only for PR metadata that cannot be recovered from Git history.
- Use **PostgreSQL** on the same machine for durable metric storage (Drizzle ORM); SQLite is not a Phase 01 target.
- Keep the future cloud path open, but do not optimize the first release around cloud deployment.

## Edge Cases & Constraints

- If no merged PRs exist in the selected range, show `No merged PRs in range`, not `0 days`.
- If previous-period data is missing, show `Baseline pending`.
- If a PR is missing a Jira key, report it as a data-quality issue.
- If a repository cannot be scanned, surface the sync error without blocking all other repos.
- If only one metric exists, the dashboard must not show placeholder cards for future metrics.

## Open Questions

- Which GitHub auth mechanism should the collector use first: GitHub CLI auth, token env var, or app credentials?
- Should team mapping start as a checked-in config file or a local untracked config file?
- Which repositories should be included or excluded from the first scan?

## Future Iterations

- Add Time to First Review.
- Add PR Size and oversized PR exceptions.
- Add Jira sync for WIP, throughput, and Jira cycle time.
- Add quality and deployment metrics after source data is available.
- Add Cloudflare/Supabase migration only after the local dashboard proves useful.

## Recommendation

Build the first release around PR Cycle Time only. This gives the Head of Engineering a real decision signal quickly, keeps the UI honest, and creates the data pipeline pattern every later metric can reuse. Do not add more dashboard cards until their data exists.

