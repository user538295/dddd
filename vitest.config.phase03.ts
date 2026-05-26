import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_TEST_DATABASE_URL = 'postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_test'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL?.trim() || env.TEST_DATABASE_URL?.trim() || DEFAULT_TEST_DATABASE_URL

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
          'src/metrics/pr-size-*.ts',
          'src/metrics/math.ts',
          'src/collector/pr-size-*.ts',
          'src/components/dashboard/PrSize*.tsx',
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
