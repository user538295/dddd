import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '.')

const fromFiles = loadEnv(process.env.NODE_ENV ?? 'development', repoRoot, '')
delete process.env.NO_COLOR
if (process.env.DATABASE_URL === undefined && fromFiles.DATABASE_URL) {
  process.env.DATABASE_URL = fromFiles.DATABASE_URL
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim())
const testIgnore = ['**/live-github-sync.spec.ts']
if (!hasDatabaseUrl) {
  testIgnore.push('**/pr-cycle-time-dashboard.spec.ts')
}

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  ...(hasDatabaseUrl
    ? {
        webServer: {
          command: 'bash scripts/e2e-web-server.sh',
          cwd: repoRoot,
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      }
    : {}),
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
      },
    },
  ],
})
