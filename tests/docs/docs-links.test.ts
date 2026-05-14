import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '../..')

function readDoc(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8')
}

describe('documentation links and phase 01 status', () => {
  it('docs_link_phase_01_plan', () => {
    const body = readDoc('Documentation/Roadmap/phases/phase-01-pr-cycle-time-mvp.md')
    expect(body).toMatch(/FEAT-001-pr-cycle-time-mvp-implementation-plan\.md/)
  })

  it('docs_trackable_roadmap_links_plan', () => {
    const body = readDoc('Documentation/Roadmap/trackable-roadmap.md')
    expect(body).toMatch(/FEAT-001-pr-cycle-time-mvp-implementation-plan\.md/)
  })

  it('docs_readme_links_trackable_roadmap', () => {
    const body = readDoc('Documentation/README.md')
    expect(body).toMatch(/Roadmap\/trackable-roadmap\.md/)
  })

  it('docs_phase_01_completion_requires_acceptance_criteria', () => {
    const body = readDoc('Documentation/Roadmap/phases/phase-01-pr-cycle-time-mvp.md')
    const after = body.split('## Acceptance criteria checklist')[1]
    expect(after, 'phase-01 must include acceptance criteria checklist heading').toBeDefined()
    const section = after!.split('## Mockup alignment')[0]!
    expect(section).not.toMatch(/- \[ \]/)
  })

  it('docs_record_mockup_alignment_status', () => {
    const body = readDoc('Documentation/Roadmap/phases/phase-01-pr-cycle-time-mvp.md')
    expect(body).toMatch(/## Mockup alignment/)
  })
})
