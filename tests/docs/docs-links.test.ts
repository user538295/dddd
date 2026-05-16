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

describe('phase 02 first review time spec', () => {
  const phase02 = 'Documentation/Roadmap/phases/phase-02-first-review-time.md'

  it('docs_phase_02_defines_metric_locks', () => {
    const body = readDoc(phase02)
    expect(body).toMatch(/## Metric definition \(locked\)/)
    expect(body).toMatch(/Qualifying review/)
    expect(body).toMatch(/PENDING.*DISMISSED|DISMISSED.*PENDING/)
    expect(body).toMatch(/No qualifying review/)
  })

  it('docs_phase_02_links_feat_002_placeholder', () => {
    const body = readDoc(phase02)
    expect(body).toMatch(/FEAT-002/)
    expect(body).toMatch(/FEAT-001-pr-cycle-time-mvp-implementation-plan\.md/)
  })

  it('docs_phase_02_requires_verification_and_tests', () => {
    const body = readDoc(phase02)
    expect(body).toMatch(/## Verification and tests/)
    expect(body).toMatch(/verify:phase02/)
  })

  it('docs_phase_02_exception_gating_documented', () => {
    const body = readDoc(phase02)
    expect(body).toMatch(/merge_without_review/)
    expect(body).toMatch(/qualifying reviews \*\*not\*\* required/)
    expect(body).toMatch(/Cap at 3/)
  })

  it('docs_phase_02_links_locked_mockup', () => {
    const body = readDoc(phase02)
    expect(body).toMatch(/04-pr-cycle-time-and-first-review\.png/)
    expect(body).toMatch(/Review-latency exceptions/)
    expect(body).toMatch(/No-review Merges/)
  })

  it('docs_trackable_roadmap_links_phase_02', () => {
    const body = readDoc('Documentation/Roadmap/trackable-roadmap.md')
    expect(body).toMatch(/phase-02-first-review-time\.md/)
    expect(body).toMatch(/04-pr-cycle-time-and-first-review\.png/)
  })
})
