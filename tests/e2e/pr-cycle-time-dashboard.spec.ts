import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('dashboard_e2e_local_dev_server_starts', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Engineering Decision Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Median PR Cycle Time' })).toBeVisible()
})

test('dashboard_e2e_shows_previous_median_when_trend_available', async ({ page }) => {
  await page.goto('/')
  const medianCard = page.getByRole('heading', { name: 'Median PR Cycle Time' }).locator('..')
  const hasTrend = await medianCard.getByText(/[+-]\d+%/).count()
  if (hasTrend === 0) {
    test.skip(true, 'No trend baseline in this environment')
  }
  await expect(medianCard.locator('.pr-dashboard__trend-prev').first()).toBeVisible()
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
  await expect(page.getByText(/PR Size/i)).toHaveCount(0)
  await expect(page.getByText(/WIP/i)).toHaveCount(0)
})
