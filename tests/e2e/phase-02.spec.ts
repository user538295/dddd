import { expect, test } from '@playwright/test'
import path from 'node:path'

import { createDb, runMigrations } from '~/db/client'
import { syncErrors, syncRuns } from '~/db/schema'
import { resetPhase02Reviews, seedPhase02Reviews } from './fixtures/phase-02-reviews.fixture'

test.describe.configure({ mode: 'serial' })

const databaseUrl = process.env.DATABASE_URL?.trim()
const repoRoot = process.env.DASHBOARD_REPO_ROOT ?? path.join(process.cwd(), '.tmp/e2e-empty-repo-root')

test.beforeEach(async () => {
  await runMigrations(databaseUrl)
  const db = createDb(databaseUrl)
  try {
    await resetPhase02Reviews(db)
    await db.delete(syncErrors)
    await db.delete(syncRuns)
    await seedPhase02Reviews(db, { repoRoot })
  } finally {
    await db.$client.end({ timeout: 5 })
  }
})

test('e2e_phase_01_unchanged_under_phase_02_load @phase02', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Median PR Cycle Time' })).toBeVisible()
})

test('e2e_no_first_review_before_sync_fixture @phase02', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('phase02-section')).toBeVisible({ timeout: 5000 })
})

test('e2e_first_sync_reveals_phase_02_section @phase02', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'First Review Time', exact: true })).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('first-review-card')).toBeVisible()
})

test('e2e_merge_without_review_visible @phase02', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('first-review-exceptions')).toBeVisible()
  await expect(page.getByText(/merged without review/i)).toBeVisible()
})

test('e2e_bot_only_pr_visible_in_hygiene_not_in_median @phase02', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('first-review-card')).toBeVisible()
  await expect(page.getByTestId('median-first-review-time')).toContainText('2h')
  await expect(page.getByText(/1 reviewed PR analyzed/i)).toBeVisible()
})
