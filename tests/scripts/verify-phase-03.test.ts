import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '../..')

function readPkg(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
}

describe('verify:phase03 wiring', () => {
  it('verify_phase03_coverage_includes_weekly_trend_chart', () => {
    const body = readFileSync(path.join(root, 'vitest.config.phase03.ts'), 'utf8')
    expect(body).toContain('src/components/dashboard/weekly-trend-chart.tsx')
  })

  it('verify_phase03_coverage_includes_weekly_trend_chart_layout', () => {
    const body = readFileSync(path.join(root, 'vitest.config.phase03.ts'), 'utf8')
    expect(body).toContain('src/components/dashboard/weekly-trend-chart-layout.ts')
  })

  it('verify_phase03_coverage_includes_pr_size_dashboard_clamp', () => {
    const configBody = readFileSync(path.join(root, 'vitest.config.phase03.ts'), 'utf8')
    expect(configBody).toContain('src/metrics/pr-cycle-time-dashboard.ts')
  })

  it('verify_phase03_script_runs_required_gates', () => {
    const pkg = readPkg()
    const scripts = pkg.scripts as Record<string, string>
    const verify = scripts['verify:phase03']
    expect(verify).toBeDefined()
    expect(verify).toMatch(/npm run lint/)
    expect(verify).toMatch(/npm run typecheck/)
    expect(verify).toMatch(
      /TZ=America\/Los_Angeles npm run test -- tests\/metrics\/pr-size-metric-utc-boundary\.test\.ts/,
    )
    expect(verify).toMatch(/vitest run --coverage --config vitest\.config\.phase03\.ts/)
    expect(verify).toMatch(/playwright test --grep @phase03/)
  })

  it('phase03_e2e_confidence_tests_are_tagged', () => {
    const body = readFileSync(path.join(root, 'tests/e2e/phase03-pr-size.spec.ts'), 'utf8')
    for (const testName of [
      'phase03_pr_size_trend_shows_completed_low_sample_confidence_note',
      'phase03_pr_size_confidence_layout_preserves_dashboard_order',
    ]) {
      const pattern = new RegExp(
        `test\\(['\`]${testName} @phase03['\`]`,
      )
      expect(body).toMatch(pattern)
    }
  })
})
