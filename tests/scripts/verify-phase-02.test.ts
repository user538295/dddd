import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '../..')

function readPkg(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
}

describe('verify:phase02 wiring', () => {
  it('verify_phase_02_script_exists', () => {
    const pkg = readPkg()
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts['verify:phase02']).toBeDefined()
    expect(scripts['verify:phase02']).toMatch(/vitest run --coverage --config vitest\.config\.phase02\.ts/)
    expect(scripts['verify:phase02']).toMatch(/playwright test --grep @phase02/)
  })

  it('verify_phase_01_script_unchanged', () => {
    const pkg = readPkg()
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts['verify:phase01']).toBe(
      'npm run lint && npm run typecheck && npm run build && npm run test -- --coverage && npm run test:e2e',
    )
  })

  it('coverage_scope_includes_all_phase_02_source_files', () => {
    const body = readFileSync(path.join(root, 'vitest.config.phase02.ts'), 'utf8')
    for (const pattern of [
      'src/metrics/first-review-',
      'src/collector/review-sync.ts',
      'src/collector/review-store.ts',
      'src/collector/bot-identity.ts',
      'src/components/dashboard/FirstReview',
    ]) {
      expect(body).toContain(pattern)
    }
  })
})
