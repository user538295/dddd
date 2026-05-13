# FEAT-001 — PR Cycle Time MVP
**Purpose**: Build the first local-first dashboard release with one trusted metric: PR Cycle Time.
**Audience**: Head of Engineering, future implementation agents, and engineers maintaining the dashboard.
**Status**: To Do

---

## Background

The Data Driven Decision Dashboard is a local-first engineering metrics product. The first release must ship quickly and avoid fake breadth. The only metric in scope is PR Cycle Time, measured from pull request opened time to merged time.

The dashboard must use cloned repositories under `/Users/manczg/Documents/work/development`, but local Git history alone does not reliably contain PR opened and merged lifecycle metadata. V1 therefore uses local repo discovery plus minimal GitHub metadata sync for PR lifecycle fields.

Current phase brief: [phase-01-pr-cycle-time-mvp.md](phase-01-pr-cycle-time-mvp.md)

Current UI reference: [PR Cycle Time first increment](../../Assets/mockups/03-pr-cycle-time-first-increment.png)

---

## Goal

When this plan is complete, the user can run the app locally, refresh PR metadata for the configured repositories, and see a dashboard with exactly one metric: median PR Cycle Time for the last 8 weeks, previous-period trend when available, PR Cycle Time exceptions, team breakdown, and data freshness.

---

## Scope

### In Scope

- TanStack Start React app scaffold.
- Local SQLite-compatible database using Drizzle schema and migrations.
- Local repository discovery from `/Users/manczg/Documents/work/development`.
- Repository-to-team mapping config.
- Minimal GitHub PR metadata sync for PR opened and merged timestamps.
- PR Cycle Time calculations.
- Dashboard UI that shows only PR Cycle Time.
- Tests first for each behavior.
- Documentation and roadmap checklist updates.

### Out of Scope

- Jira sync and Jira metrics, because Phase 01 only covers PR Cycle Time.
- AI recommendations, because deterministic rules are enough for the first release.
- First Review Time, because it is Phase 02.
- PR Size, because it is Phase 03.
- Cloud deployment, auth, and Supabase, because the MVP must work locally first.
- Individual engineer ranking, because the dashboard is for team-level leadership decisions.

---

## Acceptance criteria

- [ ] The app can be started locally.
- [ ] The database schema can be created from migrations.
- [ ] The collector discovers Git repositories under `/Users/manczg/Documents/work/development`.
- [ ] Repository scan status is stored locally.
- [ ] Repository-to-team mapping is read from config.
- [ ] GitHub PR metadata sync stores PR opened and merged timestamps.
- [ ] PR Cycle Time is computed per merged PR.
- [ ] Median PR Cycle Time is computed for the selected range.
- [ ] Previous-period comparison is computed when enough data exists.
- [ ] PR Cycle Time exceptions are computed deterministically.
- [ ] Dashboard renders exactly one metric card.
- [ ] Dashboard shows PR Cycle Time exceptions only.
- [ ] Dashboard shows 8-week PR Cycle Time trend.
- [ ] Dashboard shows team breakdown for PR Cycle Time only.
- [ ] Dashboard shows data freshness and sync errors.
- [ ] Empty states are explicit: no merged PRs, baseline pending, no repos, sync failed.
- [ ] No future metric placeholders are visible.
- [ ] Trackable roadmap checklist links to this implementation plan.

---

## What does NOT change

- Existing roadmap phase documents remain the product source of truth.
- Superseded mockups remain saved as design history.
- Future phases stay unimplemented.
- The app must not collect Jira data in Phase 01.
- The app must not show individual contributor performance metrics.

---

## Known limitations / accepted trade-offs

- GitHub metadata sync is required because Git clones do not contain reliable PR opened/merged lifecycle data.
- Manual refresh is enough for v1; scheduled background sync is deferred.
- Team mapping starts as local config to avoid needing org/team API integration.
- Cloud deployment is intentionally deferred because local filesystem access is central to v1.
- SQLite-compatible schema is used locally; later D1/Supabase portability must be reviewed before cloud migration.
- Draft PRs are included in PR Cycle Time for Phase 01 because the metric is elapsed time from PR opened to PR merged; draft-specific analysis can be added later.
- Bots are included in Phase 01 unless excluded by repository/team mapping later; individual author analytics are out of scope.
- `12 PRs missing Jira key` style freshness is implemented as PR title hygiene only; it must not call Jira in Phase 01.

---

## Implementation defaults locked for Phase 01

- Framework: TanStack Start, React, TypeScript.
- Package manager: npm.
- Test runner: Vitest for unit/component/integration tests, Playwright for e2e tests.
- Database library: Drizzle ORM with a SQLite-compatible local database.
- GitHub sync: GitHub REST API, not GraphQL and not `gh` CLI.
- GitHub auth: `GITHUB_TOKEN` environment variable first; unauthenticated mode may work for public repos but must surface rate/auth errors.
- Team mapping: checked-in example file at `config/team-mapping.example.json`; runtime default path is `./config/team-mapping.json`.
- Repo inclusion rule: scan immediate child directories of `/Users/manczg/Documents/work/development` that contain `.git`; no recursive nested repo discovery in Phase 01.
- Date range: default `Last 8 weeks`; current range is `[now - 8 weeks, now]`; previous range is the immediately preceding 8 weeks.
- Timezone: use local runtime timezone for display and ISO UTC timestamps for storage.
- Exception thresholds:
  - `team_worsened`: current team median is at least 25% worse than previous period.
  - `long_open_prs`: team has open PRs older than the current-period team median.
  - `baseline_pending`: team has current PRs but fewer than 3 merged PRs in the previous period.

---

## Architecture

- App framework: TanStack Start with React and TypeScript.
- Database: Drizzle ORM with SQLite-compatible schema and migrations.
- Collector: Node/TypeScript CLI process, separate from the web runtime.
- UI data access: server functions read computed dashboard data from the local database.
- Source repo root: `/Users/manczg/Documents/work/development`.

### Modules

- `src/config/env.ts`
  - `getEnv(): AppEnv`
  - Reads runtime config and applies defaults.

- `src/config/team-mapping.ts`
  - `loadTeamMapping(path?: string): Promise<TeamMappingConfig>`
  - Reads repo-to-team mapping.

- `src/db/schema.ts`
  - Drizzle table definitions.

- `src/db/client.ts`
  - `createDb(databaseUrl?: string): AppDb`
  - Opens the local database.

- `src/collector/repo-discovery.ts`
  - `discoverRepositories(rootPath: string): Promise<RepositoryCandidate[]>`
  - Finds directories with `.git`.

- `src/collector/github-pr-sync.ts`
  - `syncPullRequests(input: SyncPullRequestsInput): Promise<SyncPullRequestsResult>`
  - Fetches PR opened/merged metadata from GitHub.

- `src/metrics/pr-cycle-time.ts`
  - `calculatePrCycleTime(pr: PullRequestRecord): PrCycleTimeResult | null`
  - `getPrCycleTimeDashboard(input: PrCycleTimeDashboardInput): Promise<PrCycleTimeDashboard>`

- `src/routes/index.tsx`
  - Renders the dashboard from server-function data.

- `src/server/dashboard-functions.ts`
  - `getDashboardData`
  - `refreshLocalData`

### Config

- `DASHBOARD_REPO_ROOT`: string, default `/Users/manczg/Documents/work/development`.
- `DATABASE_URL`: string, default `file:./data/local.db`.
- `TEAM_MAPPING_PATH`: string, default `./config/team-mapping.json`.
- `GITHUB_TOKEN`: string, optional for authenticated GitHub API calls.
- `GITHUB_API_BASE_URL`: string, default `https://api.github.com`.
- `DASHBOARD_DEFAULT_RANGE_WEEKS`: number, default `8`.

### Core Types

```ts
export type AppEnv = {
  repoRoot: string
  databaseUrl: string
  teamMappingPath: string
  githubToken?: string
  githubApiBaseUrl: string
  defaultRangeWeeks: number
}

export type RepositoryCandidate = {
  name: string
  path: string
  remoteUrl: string | null
  owner: string | null
  repo: string | null
}

export type PullRequestRecord = {
  repositoryId: string
  githubNodeId: string
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  openedAt: Date
  mergedAt: Date | null
  url: string
}

export type PrCycleTimeResult = {
  pullRequestId: string
  cycleTimeHours: number
}

export type PrCycleTimeDashboard = {
  range: { from: string; to: string; weeks: number }
  metric: {
    medianHours: number | null
    mergedPrCount: number
    trendPercent: number | null
    baselineStatus: 'available' | 'pending'
  }
  exceptions: PrCycleTimeException[]
  weeklyTrend: Array<{ weekStart: string; medianHours: number | null }>
  teamBreakdown: Array<{
    team: string
    mergedPrs: number
    medianHours: number | null
    trendPercent: number | null
    longestOpenPrHours: number | null
  }>
  freshness: {
    reposScanned: number
    prMetadataSyncedAt: string | null
    prsMissingJiraKey: number
    syncErrors: number
  }
}
```

### Data Flow

1. User clicks `Refresh`.
2. Server function starts the local collector command or direct collector service.
3. Collector discovers repositories.
4. Collector parses GitHub owner/repo from remotes.
5. Collector syncs PR metadata.
6. Collector stores repository, PR, sync, and metric data in SQLite.
7. Dashboard server function reads computed PR Cycle Time data.
8. React UI renders only the available PR Cycle Time metric.

### Documentation References

- TanStack Start server functions: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions
- Drizzle SQLite setup: https://orm.drizzle.team/docs/get-started-sqlite
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- GitHub pull request reviews API: https://docs.github.com/en/rest/pulls/reviews

---

## Tests

- **env_defaults_are_loaded** (unit): verifies default local paths and range values.
- **env_rejects_invalid_range** (unit): rejects non-positive range weeks.
- **team_mapping_loads_valid_config** (unit): maps repo patterns to team names.
- **team_mapping_rejects_invalid_config** (unit): rejects missing teams or invalid patterns.
- **repo_discovery_finds_git_repositories** (unit): discovers only directories containing `.git`.
- **repo_discovery_parses_github_remote** (unit): extracts owner and repo from SSH and HTTPS GitHub remotes.
- **repo_discovery_records_unparseable_remote** (unit): keeps repo with null owner/repo and marks metadata incomplete.
- **db_migrations_create_schema** (integration): applies migrations to a temporary SQLite database.
- **repository_upsert_is_idempotent** (integration): repeat scans update existing repos rather than duplicating.
- **github_client_lists_prs** (unit): fetches PR lifecycle data from mocked GitHub responses.
- **github_client_handles_rate_limit** (unit): returns structured sync error on rate limit.
- **pr_sync_stores_pr_metadata** (integration): stores opened and merged timestamps.
- **cycle_time_skips_unmerged_prs** (unit): open PRs do not contribute to median cycle time.
- **cycle_time_calculates_hours** (unit): merged PR cycle time is opened-to-merged hours.
- **median_cycle_time_handles_even_and_odd_counts** (unit): median is correct for both count shapes.
- **dashboard_baseline_pending_without_previous_data** (unit): trend is absent when baseline is unavailable.
- **dashboard_computes_previous_period_trend** (unit): trend percentage is correct.
- **exceptions_detect_worsening_team** (unit): worsening team exception is emitted.
- **dashboard_server_function_returns_serializable_data** (integration): dashboard data can cross server-function boundary.
- **refresh_server_function_runs_collector** (integration): refresh updates sync status.
- **dashboard_renders_single_metric** (component): UI shows only PR Cycle Time card.
- **dashboard_empty_state_no_merged_prs** (component): empty state renders instead of zero days.
- **dashboard_e2e_local_refresh_flow** (e2e): local page loads, refresh completes, dashboard updates.

---

## Documentation update

- [ ] Phase 01 plan link, section: `Implementation Plan`, path: `Documentation/Roadmap/phases/phase-01-pr-cycle-time-mvp.md`
- [ ] Trackable roadmap link, section: `Phase 01: PR Cycle Time MVP`, path: `Documentation/Roadmap/trackable-roadmap.md`
- [ ] README status, section: `Next Step`, path: `Documentation/README.md`

---

## Task breakdown

### Phase 1 — Project scaffold and test harness
> **Releasable**: after this phase, the project can run tests and display a blank local app shell.

#### Task 1.1 — TanStack Start app scaffold
- [ ] **File**: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/routes/index.tsx`
- **Depends on**: nothing
- **Description**:
  - Initialize a TanStack Start React TypeScript app.
  - Add scripts:
    - `dev`: starts local dev server.
    - `build`: builds the app.
    - `test`: runs unit/component tests.
    - `test:e2e`: runs Playwright tests.
    - `db:generate`: generates migrations.
    - `db:migrate`: applies migrations.
    - `collector:refresh`: runs local data refresh CLI.
  - `src/routes/index.tsx` renders a minimal page title: `Engineering Decision Dashboard`.
  - No dashboard metrics yet.
- **Releasable**: after this task, the app shell can run locally.
- **Tests (TDD)** — `tests/app/app-shell.test.tsx`:
  - Component: `renders_app_title` — renders `Engineering Decision Dashboard`.
  - Checkpoint: `npm run test -- tests/app/app-shell.test.tsx`

#### Task 1.2 — Test setup
- [ ] **File**: `vitest.config.ts`, `tests/setup.ts`, `playwright.config.ts`
- **Depends on**: Task 1.1
- **Description**:
  - Configure Vitest with React Testing Library and jsdom.
  - Configure Playwright for local e2e tests.
  - Add test setup for DOM matchers.
  - Tests must run without network access by default.
- **Releasable**: after this task, unit/component/e2e test commands are available.
- **Tests (TDD)** — `tests/setup/smoke.test.ts`:
  - Unit: `test_vitest_setup_works` — verifies a basic assertion.
  - Component: `test_react_testing_library_setup_works` — renders a trivial component.
  - Checkpoint: `npm run test -- tests/setup/smoke.test.ts`

### Phase 2 — Configuration and database foundation
> **Releasable**: after this phase, the app can create and access a local SQLite-compatible database.

#### Task 2.1 — Environment config loader
- [ ] **File**: `src/config/env.ts`
- **Depends on**: Task 1.2
- **Description**:
  - Add `AppEnv` type.
  - Add `getEnv(source?: NodeJS.ProcessEnv): AppEnv`.
  - Defaults:
    - `DASHBOARD_REPO_ROOT=/Users/manczg/Documents/work/development`
    - `DATABASE_URL=file:./data/local.db`
    - `TEAM_MAPPING_PATH=./config/team-mapping.json`
    - `GITHUB_API_BASE_URL=https://api.github.com`
    - `DASHBOARD_DEFAULT_RANGE_WEEKS=8`
  - `GITHUB_TOKEN` is optional.
  - Throw `ConfigError` when `DASHBOARD_DEFAULT_RANGE_WEEKS` is not a positive integer.
- **Releasable**: after this task, every module can read validated runtime config.
- **Tests (TDD)** — `tests/config/env.test.ts`:
  - Unit: `env_defaults_are_loaded` — verifies all defaults.
  - Unit: `env_reads_overrides` — verifies custom env values.
  - Unit: `env_rejects_invalid_range` — rejects `0`, negative, and non-number values.
  - Checkpoint: `npm run test -- tests/config/env.test.ts`

#### Task 2.2 — Database schema
- [ ] **File**: `src/db/schema.ts`
- **Depends on**: Task 2.1
- **Description**:
  - Define Drizzle SQLite tables:
    - `repositories`: `id`, `name`, `path`, `remoteUrl`, `owner`, `repo`, `team`, `scanStatus`, `lastScannedAt`, `createdAt`, `updatedAt`.
    - `pullRequests`: `id`, `repositoryId`, `githubNodeId`, `number`, `title`, `state`, `isDraft`, `openedAt`, `mergedAt`, `url`, `missingJiraKey`, `createdAt`, `updatedAt`.
    - `syncRuns`: `id`, `kind`, `status`, `startedAt`, `finishedAt`, `message`, `errorCount`.
    - `syncErrors`: `id`, `syncRunId`, `repositoryId`, `source`, `message`, `createdAt`.
  - Use text timestamps in ISO 8601 format for portability.
  - Add unique constraints for repository path and pull request repository/number.
- **Releasable**: after this task, schema definitions are available for migration generation.
- **Tests (TDD)** — `tests/db/schema.test.ts`:
  - Unit: `schema_exports_required_tables` — verifies all table objects exist.
  - Unit: `schema_defines_unique_repository_path` — verifies repository path uniqueness metadata.
  - Unit: `schema_defines_unique_pr_per_repository_number` — verifies PR uniqueness metadata.
  - Checkpoint: `npm run test -- tests/db/schema.test.ts`

#### Task 2.3 — Database client and migrations
- [ ] **File**: `src/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_initial.sql`
- **Depends on**: Task 2.2
- **Description**:
  - Add `createDb(databaseUrl?: string): AppDb`.
  - Add `runMigrations(databaseUrl?: string): Promise<void>` if migration execution is not handled only by CLI.
  - Use Drizzle with a SQLite-compatible local driver.
  - Ensure local `data/` directory is created by runtime scripts, not committed database files.
  - Migration creates all Phase 01 tables.
- **Releasable**: after this task, a local database can be initialized.
- **Tests (TDD)** — `tests/db/migrations.test.ts`:
  - Integration: `db_migrations_create_schema` — applies migrations to a temporary database and verifies tables.
  - Integration: `db_client_executes_query` — runs a basic select.
  - Checkpoint: `npm run test -- tests/db/migrations.test.ts`

### Phase 3 — Repository discovery and team mapping
> **Releasable**: after this phase, the collector can scan local repositories and persist their team assignment.

#### Task 3.1 — GitHub remote parser
- [ ] **File**: `src/collector/github-remote.ts`
- **Depends on**: Task 2.3
- **Description**:
  - Add `parseGitHubRemote(remoteUrl: string): { owner: string; repo: string } | null`.
  - Support SSH remotes such as `git@github.com-gde:nexius-learning/repo-name.git`.
  - Support standard SSH remotes such as `git@github.com:owner/repo.git`.
  - Support HTTPS remotes such as `https://github.com/owner/repo.git`.
  - Strip trailing `.git`.
  - Return `null` for non-GitHub or malformed remotes.
- **Releasable**: after this task, repository discovery can normalize GitHub owner/repo values.
- **Tests (TDD)** — `tests/collector/github-remote.test.ts`:
  - Unit: `parses_standard_ssh_remote` — parses `git@github.com:owner/repo.git`.
  - Unit: `parses_ssh_host_alias_remote` — parses `git@github.com-gde:nexius-learning/repo.git`.
  - Unit: `parses_https_remote` — parses HTTPS URL.
  - Unit: `returns_null_for_non_github_remote` — returns null safely.
  - Checkpoint: `npm run test -- tests/collector/github-remote.test.ts`

#### Task 3.2 — Repository discovery
- [ ] **File**: `src/collector/repo-discovery.ts`
- **Depends on**: Task 3.1
- **Description**:
  - Add `discoverRepositories(rootPath: string): Promise<RepositoryCandidate[]>`.
  - Scan only immediate child directories of `rootPath`.
  - A repository is a directory containing `.git`.
  - Read `origin` remote with `git -C <path> remote get-url origin`.
  - If remote command fails, keep repository with `remoteUrl: null`, `owner: null`, `repo: null`.
  - Do not mutate repositories and do not run `git pull` in Phase 01.
- **Releasable**: after this task, the collector can list local cloned repos.
- **Tests (TDD)** — `tests/collector/repo-discovery.test.ts`:
  - Unit: `repo_discovery_finds_git_repositories` — finds directories containing `.git`.
  - Unit: `repo_discovery_ignores_non_repositories` — ignores folders without `.git`.
  - Unit: `repo_discovery_records_unparseable_remote` — keeps repo with null owner/repo.
  - Unit: `repo_discovery_does_not_mutate_repos` — verifies no pull/fetch command is called.
  - Checkpoint: `npm run test -- tests/collector/repo-discovery.test.ts`

#### Task 3.3 — Team mapping config
- [ ] **File**: `src/config/team-mapping.ts`, `config/team-mapping.example.json`
- **Depends on**: Task 3.2
- **Description**:
  - Add `TeamMappingConfig` type with `teams: Array<{ name: string; repoPatterns: string[] }>` and optional `defaultTeam`.
  - Add `loadTeamMapping(path?: string): Promise<TeamMappingConfig>`.
  - Add `resolveTeamForRepo(repoName: string, config: TeamMappingConfig): string`.
  - Pattern matching supports exact name and `*` wildcard suffix/prefix.
  - If no mapping matches, return `defaultTeam` or `Unassigned`.
  - Example config includes `Frontend`, `Backend`, `Platform`, `Data`, and `Unassigned`.
- **Releasable**: after this task, discovered repositories can be assigned to teams.
- **Tests (TDD)** — `tests/config/team-mapping.test.ts`:
  - Unit: `team_mapping_loads_valid_config` — loads valid JSON.
  - Unit: `team_mapping_rejects_invalid_config` — rejects empty teams and invalid patterns.
  - Unit: `resolve_team_exact_match` — exact repo name match.
  - Unit: `resolve_team_wildcard_match` — wildcard repo pattern match.
  - Unit: `resolve_team_falls_back_to_unassigned` — fallback behavior.
  - Checkpoint: `npm run test -- tests/config/team-mapping.test.ts`

#### Task 3.4 — Repository persistence
- [ ] **File**: `src/collector/repository-store.ts`
- **Depends on**: Task 3.3
- **Description**:
  - Add `upsertRepositories(db: AppDb, repositories: RepositoryCandidate[], mapping: TeamMappingConfig): Promise<RepositorySyncSummary>`.
  - Upsert by repository path.
  - Store scan status:
    - `ready` when owner/repo are available.
    - `metadata_incomplete` when remote cannot be parsed.
  - Update `lastScannedAt` on every scan.
  - Return counts: `scanned`, `ready`, `metadataIncomplete`.
- **Releasable**: after this task, repository discovery results are durable.
- **Tests (TDD)** — `tests/collector/repository-store.test.ts`:
  - Integration: `repository_upsert_is_idempotent` — repeated upsert does not duplicate rows.
  - Integration: `repository_store_assigns_team` — applies team mapping.
  - Integration: `repository_store_marks_metadata_incomplete` — stores incomplete status.
  - Checkpoint: `npm run test -- tests/collector/repository-store.test.ts`

### Phase 4 — GitHub PR metadata sync
> **Releasable**: after this phase, the local database contains PR opened and merged timestamps.

#### Task 4.1 — GitHub API client
- [ ] **File**: `src/collector/github-client.ts`
- **Depends on**: Task 3.4
- **Description**:
  - Add `GitHubClient` class.
  - Constructor: `new GitHubClient(options: { token?: string; baseUrl: string; fetchImpl?: typeof fetch })`.
  - Add `listPullRequests(input: { owner: string; repo: string; state: 'all'; since?: Date }): Promise<GitHubPullRequest[]>`.
  - Fetch PRs from GitHub REST API.
  - Normalize fields: node id, number, title, state, draft flag, openedAt, mergedAt, html URL.
  - Handle pagination.
  - On rate limit or auth failure, throw `GitHubSyncError` with `code`, `message`, and `retryAfterSeconds?: number`.
- **Releasable**: after this task, PR lifecycle metadata can be fetched from GitHub.
- **Tests (TDD)** — `tests/collector/github-client.test.ts`:
  - Unit: `github_client_lists_prs` — normalizes mocked GitHub PR response.
  - Unit: `github_client_handles_pagination` — follows `Link` headers.
  - Unit: `github_client_handles_rate_limit` — returns structured error.
  - Unit: `github_client_sends_auth_header_when_token_exists` — verifies token header.
  - Checkpoint: `npm run test -- tests/collector/github-client.test.ts`

#### Task 4.2 — Pull request persistence
- [ ] **File**: `src/collector/pull-request-store.ts`
- **Depends on**: Task 4.1
- **Description**:
  - Add `upsertPullRequests(db: AppDb, repositoryId: string, prs: GitHubPullRequest[]): Promise<PullRequestSyncSummary>`.
  - Upsert by `repositoryId` and PR number.
  - Convert timestamps to ISO strings.
  - Store `state` as `open`, `closed`, or `merged`.
  - Store `isDraft` but do not exclude draft PRs from Phase 01 metric calculations.
  - Set `missingJiraKey` using `/[A-Z][A-Z0-9]+-\d+/` against title.
  - Return counts: `seen`, `merged`, `open`, `missingJiraKey`.
- **Releasable**: after this task, synced PR metadata is durable.
- **Tests (TDD)** — `tests/collector/pull-request-store.test.ts`:
  - Integration: `pr_sync_stores_pr_metadata` — stores opened and merged timestamps.
  - Integration: `pr_sync_is_idempotent` — repeat sync updates existing row.
  - Unit: `detects_missing_jira_key` — marks title without issue key.
  - Unit: `accepts_jira_key_in_title` — does not mark title with issue key.
  - Checkpoint: `npm run test -- tests/collector/pull-request-store.test.ts`

#### Task 4.3 — Refresh collector orchestration
- [ ] **File**: `src/collector/refresh.ts`, `scripts/refresh.ts`
- **Depends on**: Task 4.2
- **Description**:
  - Add `refreshLocalData(input?: Partial<AppEnv>): Promise<RefreshSummary>`.
  - Steps:
    1. Load env.
    2. Load team mapping.
    3. Discover repositories.
    4. Upsert repositories.
    5. Sync PR metadata for repositories with owner/repo.
    6. Record `syncRuns` and `syncErrors`.
  - Add CLI entry script used by `npm run collector:refresh`.
  - Continue syncing other repositories when one repo fails.
  - Return counts: `reposScanned`, `prsSeen`, `prsMerged`, `prsMissingJiraKey`, `syncErrors`.
- **Releasable**: after this task, local refresh can populate the database.
- **Tests (TDD)** — `tests/collector/refresh.test.ts`:
  - Integration: `refresh_discovers_and_syncs_repositories` — end-to-end with temp repos and mocked GitHub.
  - Integration: `refresh_continues_after_repo_error` — records one repo error and continues.
  - Integration: `refresh_records_sync_run_status` — stores success/failure status.
  - Checkpoint: `npm run test -- tests/collector/refresh.test.ts`

### Phase 5 — PR Cycle Time calculations
> **Releasable**: after this phase, the app can compute all data required by the MVP dashboard.

#### Task 5.1 — PR Cycle Time primitive
- [ ] **File**: `src/metrics/pr-cycle-time.ts`
- **Depends on**: Task 4.3
- **Description**:
  - Add `calculatePrCycleTime(pr: PullRequestRecord): PrCycleTimeResult | null`.
  - Return null when `mergedAt` is null.
  - Calculate `cycleTimeHours` as `mergedAt - openedAt`.
  - If `mergedAt < openedAt`, return null and leave anomaly handling to sync errors.
- **Releasable**: after this task, a single PR cycle time can be computed.
- **Tests (TDD)** — `tests/metrics/pr-cycle-time.test.ts`:
  - Unit: `cycle_time_calculates_hours` — computes opened-to-merged hours.
  - Unit: `cycle_time_skips_unmerged_prs` — returns null for open PRs.
  - Unit: `cycle_time_skips_negative_duration` — returns null for invalid timestamps.
  - Checkpoint: `npm run test -- tests/metrics/pr-cycle-time.test.ts`

#### Task 5.2 — Median and weekly trend calculations
- [ ] **File**: `src/metrics/pr-cycle-time-summary.ts`
- **Depends on**: Task 5.1
- **Description**:
  - Add `median(values: number[]): number | null`.
  - Add `getWeeklyMedianTrend(prs: PullRequestRecord[], range: DateRange): WeeklyMedianPoint[]`.
  - Use merged date to bucket PRs into weeks.
  - Include empty weeks with `medianHours: null`.
  - Add `comparePeriods(currentMedian: number | null, previousMedian: number | null): { trendPercent: number | null; baselineStatus: 'available' | 'pending' }`.
- **Releasable**: after this task, metric summary and trend data can be computed.
- **Tests (TDD)** — `tests/metrics/pr-cycle-time-summary.test.ts`:
  - Unit: `median_cycle_time_handles_odd_count` — median for odd array.
  - Unit: `median_cycle_time_handles_even_count` — median for even array.
  - Unit: `weekly_trend_includes_empty_weeks` — null point for empty week.
  - Unit: `dashboard_baseline_pending_without_previous_data` — pending baseline.
  - Unit: `dashboard_computes_previous_period_trend` — percentage trend.
  - Checkpoint: `npm run test -- tests/metrics/pr-cycle-time-summary.test.ts`

#### Task 5.3 — Team breakdown and exceptions
- [ ] **File**: `src/metrics/pr-cycle-time-dashboard.ts`
- **Depends on**: Task 5.2
- **Description**:
  - Add `getPrCycleTimeDashboard(input: PrCycleTimeDashboardInput): Promise<PrCycleTimeDashboard>`.
  - Query DB for repositories and PRs in current and previous range.
  - Compute overall median, previous trend, weekly trend, and team breakdown.
  - Compute exceptions:
    - `team_worsened`: team trend worsened by at least 25%.
    - `long_open_prs`: team has open PRs older than its current median.
    - `baseline_pending`: team lacks enough previous-period data.
  - Limit exceptions to 3, sorted by severity.
  - Return serializable strings and numbers only.
- **Releasable**: after this task, the dashboard data contract is complete.
- **Tests (TDD)** — `tests/metrics/pr-cycle-time-dashboard.test.ts`:
  - Integration: `dashboard_returns_single_metric_contract` — returns full dashboard object.
  - Unit: `exceptions_detect_worsening_team` — emits worsening exception.
  - Unit: `exceptions_detect_long_open_prs` — emits stale open PR exception.
  - Unit: `exceptions_include_baseline_pending` — emits baseline pending exception.
  - Unit: `exceptions_are_limited_to_three` — caps exception list.
  - Checkpoint: `npm run test -- tests/metrics/pr-cycle-time-dashboard.test.ts`

### Phase 6 — Server functions and UI
> **Releasable**: after this phase, the MVP dashboard is usable locally.

#### Task 6.1 — Dashboard server functions
- [ ] **File**: `src/server/dashboard-functions.ts`
- **Depends on**: Task 5.3
- **Description**:
  - Add `getDashboardData` using TanStack Start `createServerFn({ method: 'GET' })`.
  - Input: `{ weeks?: number }`.
  - Validate `weeks` as positive integer, default from env.
  - Return `PrCycleTimeDashboard`.
  - Add `refreshLocalDataFn` using `createServerFn({ method: 'POST' })`.
  - `refreshLocalDataFn` invokes collector orchestration and returns `RefreshSummary`.
  - Errors are caught and returned as user-safe messages.
- **Releasable**: after this task, the UI can fetch dashboard data and trigger refresh.
- **Tests (TDD)** — `tests/server/dashboard-functions.test.ts`:
  - Integration: `dashboard_server_function_returns_serializable_data` — fetches dashboard data.
  - Integration: `refresh_server_function_runs_collector` — invokes refresh orchestration.
  - Unit: `dashboard_server_function_rejects_invalid_weeks` — validates input.
  - Checkpoint: `npm run test -- tests/server/dashboard-functions.test.ts`

#### Task 6.2 — Dashboard UI components
- [ ] **File**: `src/components/dashboard/PrCycleTimeDashboard.tsx`
- **Depends on**: Task 6.1
- **Description**:
  - Render:
    - Header with title, `Last 8 weeks`, `Local data`, and `Refresh`.
    - One metric card: `Median PR Cycle Time`.
    - Exception panel.
    - 8-week trend chart.
    - Team breakdown table.
    - Data freshness strip.
  - Do not render future KPI cards.
  - Show hours under 48h as hours and 48h+ as days with one decimal place.
  - Empty states:
    - No merged PRs: `No merged PRs in range`.
    - No baseline: `Baseline pending`.
    - Sync errors: show count in data freshness.
- **Releasable**: after this task, component-level dashboard UI is complete.
- **Tests (TDD)** — `tests/components/pr-cycle-time-dashboard.test.tsx`:
  - Component: `dashboard_renders_single_metric` — exactly one metric card.
  - Component: `dashboard_empty_state_no_merged_prs` — renders empty state.
  - Component: `dashboard_shows_baseline_pending` — renders missing baseline.
  - Component: `dashboard_shows_data_freshness` — renders repos/sync/errors.
  - Component: `dashboard_does_not_show_future_metrics` — no WIP, PR Size, First Review cards.
  - Checkpoint: `npm run test -- tests/components/pr-cycle-time-dashboard.test.tsx`

#### Task 6.3 — Route integration
- [ ] **File**: `src/routes/index.tsx`
- **Depends on**: Task 6.2
- **Description**:
  - Load dashboard data through `getDashboardData`.
  - Render `PrCycleTimeDashboard`.
  - Refresh button calls `refreshLocalDataFn`, then reloads dashboard data.
  - Loading state: `Refreshing local data`.
  - Error state: user-safe message with retry affordance.
- **Releasable**: after this task, the local dashboard page is usable end to end.
- **Tests (TDD)** — `tests/app/dashboard-route.test.tsx`:
  - Integration: `route_renders_dashboard_data` — route renders loaded data.
  - Integration: `refresh_button_updates_dashboard` — refresh triggers data reload.
  - Integration: `route_shows_refresh_error` — displays safe error.
  - Checkpoint: `npm run test -- tests/app/dashboard-route.test.tsx`

### Phase 7 — End-to-end verification and docs
> **Releasable**: after this phase, Phase 01 is ready to mark complete in the trackable roadmap.

#### Task 7.1 — Local e2e smoke test
- [ ] **File**: `tests/e2e/pr-cycle-time-dashboard.spec.ts`
- **Depends on**: Task 6.3
- **Description**:
  - Start app against a seeded temporary database.
  - Visit dashboard.
  - Verify one metric card is visible.
  - Click refresh with mocked collector or fixture mode.
  - Verify data freshness updates.
  - Verify future metrics are absent.
- **Releasable**: after this task, the MVP user flow is covered by e2e test.
- **Tests (TDD)** — `tests/e2e/pr-cycle-time-dashboard.spec.ts`:
  - E2E: `dashboard_e2e_local_refresh_flow` — full local flow.
  - Checkpoint: `npm run test:e2e -- tests/e2e/pr-cycle-time-dashboard.spec.ts`

#### Task 7.2 — Documentation status update
- [ ] **File**: `Documentation/Roadmap/trackable-roadmap.md`, `Documentation/Roadmap/phases/phase-01-pr-cycle-time-mvp.md`, `Documentation/README.md`
- **Depends on**: Task 7.1
- **Description**:
  - Link this implementation plan from Phase 01 and trackable roadmap.
  - When implementation is complete, mark Phase 01 checklist items done.
  - Keep next step pointer on Phase 01 until all Phase 01 acceptance criteria pass.
  - If UI intentionally differs from the mockup, update the phase doc with the reason.
- **Releasable**: after this task, docs describe the implemented state and next action.
- **Tests (TDD)** — `tests/docs/docs-links.test.ts`:
  - Unit: `docs_link_phase_01_plan` — verifies Phase 01 links this plan.
  - Unit: `docs_trackable_roadmap_links_plan` — verifies checklist links this plan.
  - Unit: `docs_readme_links_trackable_roadmap` — verifies README next-step links.
  - Checkpoint: `npm run test -- tests/docs/docs-links.test.ts`
