import { expect, test } from '@playwright/test'
import postgres from 'postgres'

type LatestDashboardRun = {
  status: string
  error_count: number
  message: string | null
  started_at: Date
  finished_at: Date | null
  ready_repos: number
  merged_prs_in_range: number
  auth_or_access_errors_for_latest_run: number
}

const requiredEnv = ['DATABASE_URL', 'GITHUB_TOKEN', 'DASHBOARD_REPO_ROOT', 'TEAM_MAPPING_PATH'] as const
const MS_PER_DAY = 24 * 60 * 60 * 1000

function requireEnv(name: (typeof requiredEnv)[number]): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Current-server live e2e requires ${name}`)
  }
  return value
}

function assertLiveEnvironment(): void {
  for (const key of requiredEnv) {
    requireEnv(key)
  }
  expect(process.env.DASHBOARD_E2E_REFRESH_STUB).not.toBe('1')
}

function getDefaultDashboardRange(now: Date): { from: Date; to: Date } {
  const weeksRaw = process.env.DASHBOARD_DEFAULT_RANGE_WEEKS?.trim() ?? '8'
  const weeks = Number.parseInt(weeksRaw, 10)
  if (!Number.isFinite(weeks) || String(weeks) !== weeksRaw || weeks <= 0) {
    throw new Error('DASHBOARD_DEFAULT_RANGE_WEEKS must be a positive integer for live e2e')
  }

  const from = new Date(now.getTime() - weeks * 7 * MS_PER_DAY)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

async function queryLatestDashboardRun(options: { startedAfter?: Date } = {}): Promise<LatestDashboardRun> {
  const databaseUrl = requireEnv('DATABASE_URL')
  const repoRoot = requireEnv('DASHBOARD_REPO_ROOT')
  const range = getDefaultDashboardRange(new Date())
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    const [row] = await sql<LatestDashboardRun[]>`
      with latest as (
        select id, status, error_count, message, started_at, finished_at
        from sync_runs
        where kind = 'collector_refresh'
          and ${options.startedAfter ?? new Date(0)} <= started_at
        order by started_at desc
        limit 1
      )
      select
        latest.status,
        latest.error_count,
        latest.message,
        latest.started_at,
        latest.finished_at,
        (
          select count(*)::int
          from repositories
          where root_path = ${repoRoot}
            and active = true
            and scan_status = 'ready'
        ) as ready_repos,
        (
          select count(*)::int
          from pull_requests pr
          join repositories r on r.id = pr.repository_id
          where r.root_path = ${repoRoot}
            and r.active = true
            and r.scan_status = 'ready'
            and pr.state = 'merged'
            and pr.merged_at >= ${range.from}
            and pr.merged_at <= ${range.to}
        ) as merged_prs_in_range,
        (
          select count(*)::int
          from sync_errors e
          join latest l on l.id = e.sync_run_id
          left join repositories r on r.id = e.repository_id
          where (r.root_path = ${repoRoot} or e.repository_id is null)
            and e.source in ('github_sync', 'github_reviews')
            and e.message ~* '(not found|token lacks access|unauthorized|forbidden|bad credentials|401|403)'
        ) as auth_or_access_errors_for_latest_run
      from latest
    `

    if (row === undefined) {
      throw new Error('No collector_refresh sync run exists')
    }
    return row
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function waitForLatestDashboardRun(options: { startedAfter: Date }): Promise<LatestDashboardRun> {
  const deadline = Date.now() + 240_000
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const run = await queryLatestDashboardRun({ startedAfter: options.startedAfter })
      if (run.finished_at !== null) {
        return run
      }
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('Timed out waiting for live refresh sync run to finish')
}

test.describe.configure({ mode: 'serial' })

test('running dashboard uses real data and is not hidden behind fixture e2e', async ({ page }) => {
  assertLiveEnvironment()

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Engineering Decision Dashboard' })).toBeVisible()

  const run = await queryLatestDashboardRun()
  expect(run.status, 'latest collector_refresh must not fail').not.toBe('failed')
  expect(run.finished_at, 'latest collector_refresh must finish').not.toBeNull()
  expect(run.message, 'latest collector_refresh must not be the e2e stub').not.toBe('e2e_stub')
  expect(run.error_count, 'latest collector_refresh must not record sync errors').toBe(0)
  expect(
    run.auth_or_access_errors_for_latest_run,
    'GitHub token must have read access to every included live repository',
  ).toBe(0)
  expect(run.ready_repos, 'team mapping must include at least one live repository').toBeGreaterThan(0)
  expect(run.merged_prs_in_range, 'live dashboard must have merged PRs in the default range').toBeGreaterThan(0)

  await expect(page.getByText('Sync failed')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByTestId('median-pr-cycle-time')).not.toContainText('No merged PRs in range')

  const analyzedLink = page.getByRole('link', { name: /\d+ merged PRs? analyzed/ })
  await expect(analyzedLink).toBeVisible()
  const analyzedText = await analyzedLink.textContent()
  const analyzedCount = Number.parseInt(analyzedText ?? '', 10)
  expect(Number.isFinite(analyzedCount)).toBe(true)
  expect(analyzedCount).toBe(run.merged_prs_in_range)
})

test('running dashboard refresh calls real GitHub and leaves the dashboard populated', async ({ page }) => {
  test.setTimeout(300_000)
  assertLiveEnvironment()

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const beforeClick = new Date()
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled({ timeout: 240_000 })

  const run = await waitForLatestDashboardRun({ startedAfter: beforeClick })
  expect(run.status, 'real refresh must not fail').not.toBe('failed')
  expect(run.message, 'real refresh must not be the e2e stub').not.toBe('e2e_stub')
  expect(run.error_count, 'real refresh must not record sync errors').toBe(0)
  expect(
    run.auth_or_access_errors_for_latest_run,
    'GitHub token must have read access to every included live repository',
  ).toBe(0)
  expect(run.merged_prs_in_range, 'real refresh must leave merged PRs in range').toBeGreaterThan(0)

  await expect(page.getByText('Sync failed')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByTestId('median-pr-cycle-time')).not.toContainText('No merged PRs in range')
})
