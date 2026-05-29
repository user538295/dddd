import { expect, test } from '@playwright/test'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { createDb, runMigrations } from '~/db/client'
import {
  pullRequestReviewComments,
  pullRequestReviews,
  pullRequests,
  repositories,
  syncErrors,
  syncRuns,
} from '~/db/schema'

test.describe.configure({ mode: 'serial' })

const databaseUrl = process.env.DATABASE_URL?.trim()
const repoRoot = process.env.DASHBOARD_REPO_ROOT ?? path.join(process.cwd(), '.tmp/e2e-empty-repo-root')

test.beforeEach(async () => {
  await runMigrations(databaseUrl)
  const db = createDb(databaseUrl)
  try {
    await db.delete(syncErrors)
    await db.delete(syncRuns)
    await db.delete(pullRequestReviewComments)
    await db.delete(pullRequestReviews)
    await db.delete(pullRequests)
    await db.delete(repositories)

    const repoId = randomUUID()
    await db.insert(repositories).values({
      id: repoId,
      name: 'service-api',
      path: path.join(repoRoot, 'service-api'),
      rootPath: repoRoot,
      remoteUrl: 'https://github.com/gde-mit/service-api.git',
      owner: 'gde-mit',
      repo: 'service-api',
      remoteIdentity: 'github:gde-mit/service-api',
      team: 'Backend',
      scanStatus: 'ready',
      active: true,
      lastScannedAt: new Date(),
      lastPrSyncedAt: new Date(),
    })

    await db.insert(syncRuns).values({
      id: randomUUID(),
      kind: 'collector_refresh',
      status: 'success',
      startedAt: new Date(),
      finishedAt: new Date(),
      message: 'e2e_seed',
      errorCount: 0,
    })

    const now = Date.now()
    const currentMergedAt = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const previousMergedAt = new Date(now - 70 * 24 * 60 * 60 * 1000)
    const rows = [
      { number: 1, mergedAt: currentMergedAt, hours: 24, additions: 100, deletions: 20, changedFiles: 4 },
      { number: 2, mergedAt: currentMergedAt, hours: 48, additions: 180, deletions: 20, changedFiles: 5 },
      { number: 3, mergedAt: currentMergedAt, hours: 72, additions: 250, deletions: 50, changedFiles: 8 },
      { number: 11, mergedAt: previousMergedAt, hours: 24, additions: 90, deletions: 10, changedFiles: 3 },
      { number: 12, mergedAt: previousMergedAt, hours: 24, additions: 110, deletions: 10, changedFiles: 4 },
      { number: 13, mergedAt: previousMergedAt, hours: 24, additions: 130, deletions: 20, changedFiles: 5 },
    ]

    await db.insert(pullRequests).values(
      rows.map((row) => ({
        repositoryId: repoId,
        githubNodeId: `e2e-node-${randomUUID()}`,
        number: row.number,
        title: `PROJ-${row.number} seeded PR`,
        state: 'merged',
        openedAt: new Date(row.mergedAt.getTime() - row.hours * 60 * 60 * 1000),
        githubUpdatedAt: row.mergedAt,
        mergedAt: row.mergedAt,
        additions: row.additions,
        deletions: row.deletions,
        changedFiles: row.changedFiles,
        url: `https://github.com/gde-mit/service-api/pull/${row.number}`,
      })),
    )
  } finally {
    await db.$client.end({ timeout: 5 })
  }
})

test('dashboard_e2e_local_dev_server_starts', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Engineering Decision Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Median PR Cycle Time' })).toBeVisible()
})

test('dashboard_e2e_shows_previous_median_when_trend_available', async ({ page }) => {
  await page.goto('/')
  const medianCard = page.getByRole('heading', { name: 'Median PR Cycle Time' }).locator('..')
  await expect(medianCard.getByText(/[+-]\d+%/)).toBeVisible()
  await expect(medianCard.locator('.pr-dashboard__trend-prev').first()).toBeVisible()
})

test('dashboard_e2e_shows_pr_cycle_time_16_week_comparison_trend', async ({ page }) => {
  await page.goto('/')

  const chart = page.getByRole('img', { name: '16-week PR cycle time comparison trend' })
  await expect(page.getByRole('heading', { name: '16-week PR cycle time comparison trend' })).toBeVisible()
  await expect(chart).toBeVisible()
  await expect(chart.getByTestId('comparison-label-previous')).toBeVisible()
  await expect(chart.getByTestId('comparison-label-current')).toBeVisible()
})

test('dashboard_e2e_pr_cycle_time_comparison_trend_desktop_layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const chart = page.getByRole('img', { name: '16-week PR cycle time comparison trend' })
  const previous = chart.getByTestId('comparison-label-previous')
  const current = chart.getByTestId('comparison-label-current')
  const divider = chart.getByTestId('comparison-boundary-divider')

  await expect(chart).toBeVisible()
  await expect(divider).toHaveAttribute('stroke-dasharray', '3 4')
  const chartBox = await chart.boundingBox()
  const previousBox = await previous.boundingBox()
  const currentBox = await current.boundingBox()
  expect(chartBox).not.toBeNull()
  expect(previousBox).not.toBeNull()
  expect(currentBox).not.toBeNull()
  expect(previousBox!.x + previousBox!.width).toBeLessThan(currentBox!.x)
  expect(previousBox!.y).toBeGreaterThanOrEqual(chartBox!.y)
  expect(currentBox!.y).toBeGreaterThanOrEqual(chartBox!.y)
})

test('dashboard_e2e_pr_cycle_time_comparison_trend_mobile_layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const chart = page.getByRole('img', { name: '16-week PR cycle time comparison trend' })
  const previous = chart.getByTestId('comparison-label-previous')
  const current = chart.getByTestId('comparison-label-current')
  const divider = chart.getByTestId('comparison-boundary-divider')

  await expect(chart).toBeVisible()
  await expect(divider).toHaveAttribute('stroke-dasharray', '3 4')
  const chartBox = await chart.boundingBox()
  const previousBox = await previous.boundingBox()
  const currentBox = await current.boundingBox()
  expect(chartBox).not.toBeNull()
  expect(previousBox).not.toBeNull()
  expect(currentBox).not.toBeNull()
  expect(previousBox!.x).toBeGreaterThanOrEqual(chartBox!.x)
  expect(currentBox!.x + currentBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width)
  expect(previousBox!.x + previousBox!.width).toBeLessThan(currentBox!.x)
})

test('dashboard_e2e_local_refresh_flow', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled({ timeout: 60_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  const footer = page.getByTestId('data-freshness')
  await expect(footer).toContainText('repos scanned')
  await expect(footer).toContainText('GitHub PR metadata synced')
  await expect(page.getByTestId('phase03-section')).toBeVisible()
  await expect(page.getByTestId('median-pr-size')).toContainText('200 lines')
  await expect(page.getByText(/WIP/i)).toHaveCount(0)
})
