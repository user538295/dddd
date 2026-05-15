import { chromium } from '@playwright/test'

const baseUrl = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:3000'

const browser = await chromium.launch()
const page = await browser.newPage()

try {
  const res = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 })
  if (!res?.ok()) {
    throw new Error(`Home returned ${res?.status() ?? 'no response'}`)
  }

  await page.getByRole('heading', { name: 'Median PR Cycle Time' }).waitFor({ timeout: 30_000 })

  const medianCard = page.getByRole('heading', { name: 'Median PR Cycle Time' }).locator('..')
  const headlineTrend = medianCard.locator('.pr-dashboard__metric-trend-pct')
  const headlinePrev = medianCard.locator('.pr-dashboard__trend-prev')

  const headlineTrendText = (await headlineTrend.textContent())?.trim() ?? ''
  const headlinePrevText = (await headlinePrev.textContent())?.trim() ?? ''

  const teamPrevCells = page.locator('.pr-dashboard__trend-stack .pr-dashboard__trend-prev')
  const teamPrevCount = await teamPrevCells.count()
  const teamPrevSamples = []
  for (let i = 0; i < Math.min(teamPrevCount, 5); i += 1) {
    teamPrevSamples.push((await teamPrevCells.nth(i).textContent())?.trim() ?? '')
  }

  const screenshotPath = '.tmp/manual-check-previous-median.png'
  await page.screenshot({ path: screenshotPath, fullPage: true })

  console.log(JSON.stringify({
    url: baseUrl,
    headlineMedian: (await page.getByTestId('median-pr-cycle-time').textContent())?.trim(),
    headlineTrend: headlineTrendText,
    headlinePreviousMedian: headlinePrevText,
    teamRowsWithPreviousMedian: teamPrevCount,
    teamPreviousMedianSamples: teamPrevSamples,
    screenshotPath,
  }, null, 2))
} finally {
  await browser.close()
}
