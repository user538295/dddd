import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '.')

const fromFiles = loadEnv(process.env.NODE_ENV ?? 'development', repoRoot, '')
delete process.env.NO_COLOR
for (const key of [
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'DASHBOARD_REPO_ROOT',
  'TEAM_MAPPING_PATH',
  'GITHUB_API_BASE_URL',
  'GITHUB_SYNC_OWNER',
  'DASHBOARD_DEFAULT_RANGE_WEEKS',
  'DASHBOARD_INITIAL_SYNC_FROM',
  'GITHUB_SYNC_CONCURRENCY',
]) {
  if (process.env[key] === undefined && fromFiles[key]) {
    process.env[key] = fromFiles[key]
  }
}

const required = ['DATABASE_URL', 'GITHUB_TOKEN', 'DASHBOARD_REPO_ROOT', 'TEAM_MAPPING_PATH']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length > 0) {
  throw new Error(`Live e2e requires real environment values: ${missing.join(', ')}`)
}
if (process.env.DASHBOARD_E2E_REFRESH_STUB?.trim() === '1') {
  throw new Error('Live e2e must not run with DASHBOARD_E2E_REFRESH_STUB=1')
}

const port = Number.parseInt(process.env.PORT ?? '3001', 10)
if (!Number.isFinite(port) || port <= 0) {
  throw new Error('PORT must be a positive integer for live e2e')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/live-github-sync.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  webServer: {
    command: 'bash scripts/live-e2e-web-server.sh',
    cwd: repoRoot,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
    },
  },
  projects: [
    {
      name: 'chromium-live',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${port}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    },
  ],
})
