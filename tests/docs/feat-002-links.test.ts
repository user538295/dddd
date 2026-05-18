import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '../..')

function readDoc(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8')
}

describe('FEAT-002 documentation links', () => {
  it('docs_phase_02_links_feat_002', () => {
    const body = readDoc('Documentation/Completed/phase-02-first-review-time.md')
    expect(body).toMatch(/FEAT-002-first-review-time-implementation-plan\.md/)
    expect(body).not.toMatch(/FEAT-002.*\(to be authored before coding starts/)
  })

  it('docs_trackable_roadmap_links_feat_002', () => {
    const body = readDoc('Documentation/Roadmap/trackable-roadmap.md')
    const phase02Section = body.split('## Phase 02: First Review Time')[1]?.split('## Phase 03')[0]
    expect(phase02Section, 'phase 02 section exists in trackable roadmap').toBeDefined()
    expect(phase02Section!).toMatch(/FEAT-002-first-review-time-implementation-plan\.md/)
  })

  it('docs_readme_next_step_points_at_phase_03', () => {
    const body = readDoc('Documentation/README.md')
    const nextStep = body.split('## Next Step')[1]
    expect(nextStep, 'README contains Next Step section').toBeDefined()
    expect(nextStep!).toMatch(/phase-03-pr-size\.md/)
    expect(nextStep!).toMatch(/FEAT-002-first-review-time-implementation-plan\.md/)
  })
})
