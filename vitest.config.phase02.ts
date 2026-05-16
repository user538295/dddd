import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        include: [
          'src/metrics/first-review-*.ts',
          'src/collector/review-sync.ts',
          'src/collector/review-store.ts',
          'src/collector/bot-identity.ts',
          'src/components/dashboard/FirstReview*.tsx',
          'src/components/dashboard/FreshnessStrip.tsx',
          'src/metrics/pr-cycle-time-dashboard.ts',
          'src/collector/github-client.ts',
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
  }),
)
