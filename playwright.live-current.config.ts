import { defineConfig, devices } from '@playwright/test'

import { loadLocalEnv } from './scripts/local-env'

loadLocalEnv({ preferDotenvKeys: ['GITHUB_TOKEN'] })

const baseURL = process.env.DASHBOARD_LIVE_BASE_URL?.trim() || 'http://127.0.0.1:3000'
const required = ['DATABASE_URL', 'GITHUB_TOKEN', 'DASHBOARD_REPO_ROOT', 'TEAM_MAPPING_PATH']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length > 0) {
  throw new Error(`Current-server live e2e requires real environment values: ${missing.join(', ')}`)
}
if (process.env.DASHBOARD_E2E_REFRESH_STUB?.trim() === '1') {
  throw new Error('Current-server live e2e must not run with DASHBOARD_E2E_REFRESH_STUB=1')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/live-current-server.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-live-current',
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
      },
    },
  ],
})
