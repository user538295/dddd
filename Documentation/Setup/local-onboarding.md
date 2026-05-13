# Local Onboarding

Status: Draft
Last updated: 2026-05-13

## Purpose

This guide prepares the local configuration needed to run the PR Cycle Time MVP against real repositories.

## Files

- `.env.example` is the tracked template with default values.
- `.env` is the local editable file and is gitignored.
- `config/team-mapping.example.json` is the tracked repository/team selection template.
- `config/team-mapping.json` is the local editable config and is gitignored.
- `data/` stores the local SQLite-compatible database.

## Default Local Values

```env
DASHBOARD_REPO_ROOT=/Users/manczg/Documents/work/development
DATABASE_URL=file:./data/local.db
TEAM_MAPPING_PATH=./config/team-mapping.json
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_TOKEN=
DASHBOARD_DEFAULT_RANGE_WEEKS=8
DASHBOARD_INITIAL_SYNC_FROM=2026-01-01
GITHUB_SYNC_CONCURRENCY=2
```

## Repository Selection

The collector discovers immediate child directories of `DASHBOARD_REPO_ROOT` that contain `.git`.

After discovery, `config/team-mapping.json` decides which discovered repositories are synced:

- `includeRepoPatterns` limits the synced set. If omitted, every discovered repository is included.
- `excludeRepoPatterns` removes repositories from sync and metrics.
- `teams[].repoPatterns` maps repositories to teams.
- `defaultTeam` is used when no team pattern matches.

Example:

```json
{
  "includeRepoPatterns": ["*"],
  "excludeRepoPatterns": ["*-archive", "experiment-*"],
  "defaultTeam": "Unassigned",
  "teams": [
    { "name": "Frontend", "repoPatterns": ["web-*", "*-ui"] },
    { "name": "Backend", "repoPatterns": ["api-*", "service-*"] }
  ]
}
```

## First Real Test Checklist

1. Confirm repositories exist under `/Users/manczg/Documents/work/development`.
2. Edit `.env` and set `GITHUB_TOKEN`.
3. Edit `config/team-mapping.json` to include only the repositories you want to test first.
4. Keep `DASHBOARD_INITIAL_SYNC_FROM=2026-01-01` for the first run unless you need older PR data.
5. Keep `GITHUB_SYNC_CONCURRENCY=2` for the first real run.
6. Start with a small include list, verify the dashboard, then widen the patterns.

## Notes

- A fresh database syncs PRs updated on or after `DASHBOARD_INITIAL_SYNC_FROM`.
- Later refreshes use the stored GitHub update cursor for incremental sync.
- Excluded repositories are stored as excluded but are not synced or included in metrics.
- The dashboard range stays independent from sync range. The default dashboard range is the last 8 weeks.

