import { expect, test } from '@playwright/test'
import path from 'node:path'

import { createDb, runMigrations } from '~/db/client'
import { resetPhase03, seedPhase03 } from './fixtures/phase-03-size.fixture'

test.describe.configure({ mode: 'serial' })

const databaseUrl = process.env.DATABASE_URL?.trim()
const repoRoot = process.env.DASHBOARD_REPO_ROOT ?? path.join(process.cwd(), '.tmp/e2e-empty-repo-root')

test.beforeEach(async () => {
  await runMigrations(databaseUrl)
  const db = createDb(databaseUrl)
  try {
    await resetPhase03(db)
    await seedPhase03(db, { repoRoot, scenario: 'with-exceptions' })
  } finally {
    await db.$client.end({ timeout: 5 })
  }
})

test('phase03_pr_size_section_visible_when_data_exists @phase03', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('phase03-section')).toBeVisible({ timeout: 5000 })
})

test('phase03_pr_size_section_hidden_when_no_data @phase03', async ({ page }) => {
  const db = createDb(databaseUrl)
  try {
    await resetPhase03(db)
    await seedPhase03(db, { repoRoot, scenario: 'no-size-data' })
  } finally {
    await db.$client.end({ timeout: 5 })
  }
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Engineering Decision Dashboard' })).toBeVisible()
  await expect(page.getByTestId('phase03-section')).not.toBeVisible()
})

test('phase03_pr_size_card_shows_median @phase03', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('pr-size-card')).toBeVisible({ timeout: 5000 })
  // Median of [20, 20, 71, 71, 150, 300] = (71+71)/2 = 71
  await expect(page.getByTestId('median-pr-size')).toContainText('71 lines')
})

test('phase03_team_table_renders @phase03', async ({ page }) => {
  await page.goto('/')
  const prSizeTable = page.getByTestId('pr-size-team-table')
  await expect(prSizeTable).toBeVisible({ timeout: 5000 })
  await expect(prSizeTable.getByRole('cell', { name: 'TeamAlpha' })).toBeVisible()
})

test('phase03_exceptions_panel_hidden_when_no_exceptions @phase03', async ({ page }) => {
  const db = createDb(databaseUrl)
  try {
    await resetPhase03(db)
    await seedPhase03(db, { repoRoot, scenario: 'no-exceptions' })
  } finally {
    await db.$client.end({ timeout: 5 })
  }
  await page.goto('/')
  await expect(page.getByTestId('phase03-section')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('pr-size-exceptions')).not.toBeVisible()
})

test('phase03_phase01_still_visible @phase03', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Median PR Cycle Time' })).toBeVisible()
  await expect(page.getByTestId('phase03-section')).toBeVisible({ timeout: 5000 })
})

test('phase03_phase02_still_visible @phase03', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('phase02-section')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('phase03-section')).toBeVisible({ timeout: 5000 })
})
