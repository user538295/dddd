import { describe, expect, it } from 'vitest'

import { buildPrSizeExceptions } from '~/metrics/pr-size-exceptions'
import type { PrSizeRecord } from '~/metrics/pr-size-types'

let seq = 0

function pr(overrides: Partial<PrSizeRecord> = {}): PrSizeRecord {
  seq += 1
  return {
    id: `pr-${seq}`,
    number: seq,
    title: `PR ${seq}`,
    url: `https://github.com/o/r/pull/${seq}`,
    repositoryId: 'repo-1',
    repoFullName: 'o/r',
    team: 'alpha',
    mergedAt: new Date('2026-03-10T12:00:00.000Z'),
    additions: 50,
    deletions: 0,
    changedFiles: 1,
    ...overrides,
  }
}

function teamMap(entries: Record<string, PrSizeRecord[]>): Map<string, PrSizeRecord[]> {
  return new Map(Object.entries(entries))
}

describe('buildPrSizeExceptions', () => {
  it('fires_when_50pct_prs_exceed_2x_median', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        alpha: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ],
      }),
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      type: 'oversized_pr_pattern',
      severity: 'warning',
      team: 'alpha',
      flaggedPrCount: 2,
      totalPrCount: 4,
    })
  })

  it('fires_at_exact_50pct_boundary', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        beta: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'beta' })),
      }),
    )
    expect(out.some((e) => e.team === 'beta')).toBe(true)
  })

  it('does_not_fire_at_below_50pct', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        gamma: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'gamma' })),
      }),
    )
    expect(out).toHaveLength(0)
  })

  it('suppressed_for_fewer_than_3_prs', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        delta: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'delta' })),
      }),
    )
    expect(out).toHaveLength(0)
  })

  it('sorted_by_flagged_ratio_descending', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        low: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'low' })),
        high: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'high' })),
      }),
    )
    expect(out.map((e) => e.team)).toEqual(['high', 'low'])
  })

  it('capped_at_three_teams', () => {
    const teams: Record<string, PrSizeRecord[]> = {}
    for (let i = 0; i < 5; i += 1) {
      const name = `team-${i}`
      teams[name] = [
        pr({ additions: 20, deletions: 0 }),
        pr({ additions: 20, deletions: 0 }),
        pr({ additions: 71, deletions: 0 }),
        pr({ additions: 71, deletions: 0 }),
      ].map((p) => ({ ...p, team: name }))
    }
    const out = buildPrSizeExceptions(teamMap(teams))
    expect(out).toHaveLength(3)
  })

  it('null_size_prs_excluded_from_all_counts', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        epsilon: [
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 20, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: 71, deletions: 0 }),
          pr({ additions: null, deletions: null }),
        ].map((p) => ({ ...p, team: 'epsilon' })),
      }),
    )
    const ex = out.find((e) => e.team === 'epsilon')
    expect(ex?.totalPrCount).toBe(4)
    expect(ex?.flaggedPrCount).toBe(2)
  })

  it('chronically_large_team_not_flagged', () => {
    const out = buildPrSizeExceptions(
      teamMap({
        zeta: [
          pr({ additions: 500, deletions: 0 }),
          pr({ additions: 600, deletions: 0 }),
          pr({ additions: 700, deletions: 0 }),
        ].map((p) => ({ ...p, team: 'zeta' })),
      }),
    )
    expect(out).toHaveLength(0)
  })
})
