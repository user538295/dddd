import { describe, expect, it } from 'vitest'

import { calculatePrCycleTime, type PullRequestRecord } from '~/metrics/pr-cycle-time'

function basePr(overrides: Partial<PullRequestRecord> = {}): PullRequestRecord {
  const openedAt = new Date('2024-01-01T10:00:00.000Z')
  return {
    id: '00000000-0000-4000-8000-000000000001',
    repositoryId: '00000000-0000-4000-8000-000000000002',
    githubNodeId: 'node-1',
    number: 1,
    title: 'PR-1',
    state: 'merged',
    isDraft: false,
    openedAt,
    githubUpdatedAt: new Date('2024-01-01T12:00:00.000Z'),
    mergedAt: new Date('2024-01-01T13:00:00.000Z'),
    url: 'https://github.com/o/r/pull/1',
    missingJiraKey: false,
    createdAt: new Date('2024-01-01T09:00:00.000Z'),
    updatedAt: new Date('2024-01-01T09:00:00.000Z'),
    ...overrides,
  }
}

describe('calculatePrCycleTime', () => {
  it('cycle_time_calculates_hours', () => {
    const result = calculatePrCycleTime(
      basePr({
        openedAt: new Date('2024-01-01T10:00:00.000Z'),
        mergedAt: new Date('2024-01-01T13:00:00.000Z'),
      }),
    )
    expect(result).toEqual({
      pullRequestId: '00000000-0000-4000-8000-000000000001',
      cycleTimeHours: 3,
    })
  })

  it('cycle_time_skips_unmerged_prs', () => {
    expect(calculatePrCycleTime(basePr({ mergedAt: null, state: 'open' }))).toBeNull()
  })

  it('cycle_time_skips_negative_duration', () => {
    expect(
      calculatePrCycleTime(
        basePr({
          openedAt: new Date('2024-01-02T10:00:00.000Z'),
          mergedAt: new Date('2024-01-01T10:00:00.000Z'),
        }),
      ),
    ).toBeNull()
  })
})
