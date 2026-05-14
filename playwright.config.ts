import { defineConfig, devices } from '@playwright/test'

const loopbackBypass = 'localhost,127.0.0.1,<-loopback>'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
        proxy: {
          server: 'http://127.0.0.1:9',
          bypass: loopbackBypass,
        },
      },
    },
  ],
})
