import { describe, expect, it } from 'vitest'
import { computeFirstReviewMedian, type PrAggregate } from '~/metrics/first-review-time'

const RANGE = {
  start: new Date('2026-04-01T00:00:00Z'),
  end: new Date('2026-04-30T00:00:00Z'),
}

function agg(overrides: Partial<PrAggregate>): PrAggregate {
  return {
    prId: overrides.prId ?? `pr-${Math.random()}`,
    prNumber: overrides.prNumber ?? 1,
    title: overrides.title ?? 't',
    repoId: overrides.repoId ?? 'r-1',
    repoFullName: overrides.repoFullName ?? 'o/r',
    team: overrides.team ?? 'T',
    openedAt: overrides.openedAt ?? new Date('2026-04-10T00:00:00Z'),
    mergedAt: overrides.mergedAt ?? new Date('2026-04-12T00:00:00Z'),
    firstQualifyingHumanReviewAt: overrides.firstQualifyingHumanReviewAt ?? null,
    anyQualifyingReviewCount: overrides.anyQualifyingReviewCount ?? 0,
    qualifyingHumanReviewCount: overrides.qualifyingHumanReviewCount ?? 0,
    qualifyingBotReviewCount: overrides.qualifyingBotReviewCount ?? 0,
    firstQualifyingReviewIsBot: overrides.firstQualifyingReviewIsBot ?? false,
    preMergeCommentCount: overrides.preMergeCommentCount ?? 0,
    mergeWithoutReviewMatchesHygieneRule: overrides.mergeWithoutReviewMatchesHygieneRule ?? false,
  }
}

const SYNCED = new Set(['r-1'])

describe('first-review median', () => {
  it('median_humans_only', () => {
    const result = computeFirstReviewMedian({
      prs: [
        agg({
          openedAt: new Date('2026-04-10T00:00:00Z'),
          firstQualifyingHumanReviewAt: new Date('2026-04-10T02:00:00Z'),
        }),
      ],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.medianHours).toBe(2)
  })

  it('coverage_subtitle_m_of_n_population', () => {
    const result = computeFirstReviewMedian({
      prs: [
        agg({ firstQualifyingHumanReviewAt: new Date('2026-04-10T02:00:00Z') }),
        agg({ firstQualifyingHumanReviewAt: null }),
      ],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.M).toBe(1)
    expect(result.N).toBe(2)
  })

  it('coverage_subtitle_n_excludes_unsynced_repo_prs', () => {
    const result = computeFirstReviewMedian({
      prs: [agg({ repoId: 'r-other' })],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.N).toBe(0)
  })

  it('bot_only_pr_excluded_from_median_and_M', () => {
    const result = computeFirstReviewMedian({
      prs: [agg({ firstQualifyingHumanReviewAt: null, qualifyingBotReviewCount: 1 })],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.medianHours).toBeNull()
    expect(result.M).toBe(0)
    expect(result.N).toBe(1)
  })

  it('median_null_when_M_zero', () => {
    const result = computeFirstReviewMedian({
      prs: [agg({ firstQualifyingHumanReviewAt: null })],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.medianHours).toBeNull()
  })

  it('median_handles_even_and_odd_counts', () => {
    const even = computeFirstReviewMedian({
      prs: [
        agg({
          openedAt: new Date('2026-04-10T00:00:00Z'),
          firstQualifyingHumanReviewAt: new Date('2026-04-10T02:00:00Z'),
        }),
        agg({
          openedAt: new Date('2026-04-11T00:00:00Z'),
          firstQualifyingHumanReviewAt: new Date('2026-04-11T04:00:00Z'),
        }),
      ],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(even.medianHours).toBe(3)
  })

  it('median_handles_single_qualifying_pr', () => {
    const out = computeFirstReviewMedian({
      prs: [
        agg({
          openedAt: new Date('2026-04-10T00:00:00Z'),
          firstQualifyingHumanReviewAt: new Date('2026-04-10T05:00:00Z'),
        }),
      ],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(out.medianHours).toBe(5)
    expect(out.M).toBe(1)
  })

  it('coverage_subtitle_data_omitted_at_metric_level_when_N_zero', () => {
    const result = computeFirstReviewMedian({
      prs: [],
      range: RANGE,
      reviewSyncedRepoIds: SYNCED,
    })
    expect(result.M).toBe(0)
    expect(result.N).toBe(0)
    expect(result.medianHours).toBeNull()
  })
})
