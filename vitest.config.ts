import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_TEST_DATABASE_URL = 'postgresql://dddd:dddd_local_dev@127.0.0.1:54332/dddd_dev'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = DEFAULT_TEST_DATABASE_URL
  }

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
      // DB-touching tests share a single Postgres instance and would race on
      // shared tables (sync_runs, sync_errors). Serialize file execution so
      // each file owns the DB while it runs.
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.gen.ts',
          'src/routes/__root.tsx',
          // Connection + migrator wiring is covered by tests/db/migrations.test.ts when DATABASE_URL is set.
          'src/db/client.ts',
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
