import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  loadEnv(mode, __dirname, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        include: [
          'src/metrics/first-review-*.ts',
          'src/collector/review-sync.ts',
          'src/collector/review-store.ts',
          'src/collector/bot-identity.ts',
          'src/components/dashboard/FirstReview*.tsx',
          'src/metrics/exception-sort.ts',
        ],
        thresholds: {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
    },
  }
})
