import { expect, test } from '@playwright/test'
import postgres from 'postgres'

type LatestSyncRun = {
  id: string
  status: string
  error_count: number
  started_at: Date
  finished_at: Date | null
}

type DashboardCounts = {
  ready_repos: number
  merged_prs_in_range: number
  sync_errors_for_latest_run: number
  auth_or_access_errors_for_latest_run: number
}

const requiredEnv = ['DATABASE_URL', 'GITHUB_TOKEN', 'DASHBOARD_REPO_ROOT', 'TEAM_MAPPING_PATH'] as const
const MS_PER_DAY = 24 * 60 * 60 * 1000

function requireEnv(name: (typeof requiredEnv)[number]): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Live e2e requires ${name}`)
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

async function queryLatestRunAndCounts(): Promise<{
  latestRun: LatestSyncRun
  counts: DashboardCounts
}> {
  const databaseUrl = requireEnv('DATABASE_URL')
  const repoRoot = requireEnv('DASHBOARD_REPO_ROOT')
  const range = getDefaultDashboardRange(new Date())
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    const [latestRun] = await sql<LatestSyncRun[]>`
      select id, status, error_count, started_at, finished_at
      from sync_runs
      where kind = 'collector_refresh'
      order by started_at desc
      limit 1
    `
    if (latestRun === undefined) {
      throw new Error('No collector_refresh sync run exists after live refresh')
    }

    const [counts] = await sql<DashboardCounts[]>`
      with latest as (
        select id
        from sync_runs
        where kind = 'collector_refresh'
        order by started_at desc
        limit 1
      )
      select
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
        ) as sync_errors_for_latest_run,
        (
          select count(*)::int
          from sync_errors e
          join latest l on l.id = e.sync_run_id
          where e.source = 'github_sync'
            and e.message ~* '(not found|token lacks access|unauthorized|forbidden|bad credentials|401|403)'
        ) as auth_or_access_errors_for_latest_run
    `
    if (counts === undefined) {
      throw new Error('Could not compute live dashboard counts')
    }

    return { latestRun, counts }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

test.describe.configure({ mode: 'serial' })

test('live_github_sync_refresh_uses_real_github_and_keeps_dashboard_populated', async ({ page }) => {
  test.setTimeout(300_000)
  assertLiveEnvironment()

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Engineering Decision Dashboard' })).toBeVisible()

  const refreshButton = page.getByRole('button', { name: 'Refresh' })
  await refreshButton.click()
  await expect(page.getByRole('button', { name: /Refreshing/ })).toBeVisible({ timeout: 10_000 })
  await expect(refreshButton).toBeEnabled({ timeout: 240_000 })

  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('Sync failed')).toHaveCount(0)
  await expect(page.getByTestId('median-pr-cycle-time')).not.toContainText('No merged PRs in range')

  const analyzedLink = page.getByRole('link', { name: /\d+ merged PRs? analyzed/ })
  await expect(analyzedLink).toBeVisible()
  const analyzedText = await analyzedLink.textContent()
  const analyzedCount = Number.parseInt(analyzedText ?? '', 10)
  expect(Number.isFinite(analyzedCount)).toBe(true)
  expect(analyzedCount).toBeGreaterThan(0)

  await page.goto('/sources/merged-prs')
  await expect(page.getByRole('heading', { name: 'Merged pull requests' })).toBeVisible()
  await expect(page.getByText('No merged pull requests in this range.')).toHaveCount(0)

  const { latestRun, counts } = await queryLatestRunAndCounts()
  expect(latestRun.status).not.toBe('failed')
  expect(latestRun.finished_at).not.toBeNull()
  expect(counts.auth_or_access_errors_for_latest_run).toBe(0)
  expect(counts.ready_repos).toBeGreaterThan(0)
  expect(counts.merged_prs_in_range).toBeGreaterThan(0)
  expect(counts.merged_prs_in_range).toBe(analyzedCount)
})
