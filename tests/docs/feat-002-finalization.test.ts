import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

describe('FEAT-002 finalization docs', () => {
  it('docs_phase_02_checklist_updated', () => {
    const body = read('Documentation/Completed/phase-02-first-review-time.md')
    const section = body.split('## Acceptance criteria checklist')[1]?.split('##')[0] ?? ''
    expect(section).not.toMatch(/- \[ \]/)
    expect(section).toMatch(/- \[x\]/)
  })

  it('docs_trackable_roadmap_marks_phase_02_implemented', () => {
    const body = read('Documentation/Roadmap/trackable-roadmap.md')
    expect(body).toMatch(/Phase 02: First Review Time \(Implemented\)/)
  })

  it('docs_readme_next_step_post_phase_02_updated', () => {
    const body = read('Documentation/README.md')
    const nextStep = body.split('## Next Step')[1] ?? ''
    expect(nextStep).toMatch(/Phase 02 \(First Review Time\) is implemented/)
    expect(nextStep).toMatch(/Phase 03/)
  })
})
