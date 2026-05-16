import { describe, expect, it } from 'vitest'
import {
  compareFirstReviewPeriods,
  getFirstReviewWeeklyTrend,
  type PrAggregate,
} from '~/metrics/first-review-time'

function agg(overrides: Partial<PrAggregate>): PrAggregate {
  return {
    prId: `pr-${Math.random()}`,
    prNumber: 1,
    title: 't',
    repoId: 'r-1',
    repoFullName: 'o/r',
    team: 'T',
    openedAt: overrides.openedAt ?? new Date('2026-03-01T00:00:00Z'),
    mergedAt: overrides.mergedAt ?? new Date('2026-03-02T00:00:00Z'),
    firstQualifyingHumanReviewAt: overrides.firstQualifyingHumanReviewAt ?? null,
    anyQualifyingReviewCount: 1,
    qualifyingHumanReviewCount: 1,
    qualifyingBotReviewCount: 0,
    firstQualifyingReviewIsBot: false,
    preMergeCommentCount: 0,
    mergeWithoutReviewMatchesHygieneRule: false,
  }
}

const RANGE_8W = {
  start: new Date('2026-03-01T00:00:00Z'),
  end: new Date('2026-04-26T00:00:00Z'),
}

describe('first-review weekly trend and period comparison', () => {
  it('first_review_weekly_trend_renders_null_weeks', () => {
    const out = getFirstReviewWeeklyTrend([], RANGE_8W)
    expect(out).toHaveLength(8)
    expect(out.every((p) => p.medianHours === null)).toBe(true)
  })

  it('trend_gate_three_qualifying_human_prs', () => {
    const out = compareFirstReviewPeriods({
      currentMedian: 5,
      previousMedian: 4,
      previousQualifyingPrCount: 3,
    })
    expect(out.baselineStatus).toBe('available')
    expect(out.trendPercent).not.toBeNull()
  })

  it('trend_gate_two_qualifying_human_prs', () => {
    const out = compareFirstReviewPeriods({
      currentMedian: 5,
      previousMedian: 4,
      previousQualifyingPrCount: 2,
    })
    expect(out.baselineStatus).toBe('pending')
    expect(out.trendPercent).toBeNull()
  })

  it('trend_percent_null_when_previous_median_zero', () => {
    const out = compareFirstReviewPeriods({
      currentMedian: 5,
      previousMedian: 0,
      previousQualifyingPrCount: 5,
    })
    expect(out.trendPercent).toBeNull()
  })

  it('trend_bucketed_into_weeks_with_data', () => {
    const out = getFirstReviewWeeklyTrend(
      [
        agg({
          openedAt: new Date('2026-03-02T00:00:00Z'),
          mergedAt: new Date('2026-03-03T00:00:00Z'),
          firstQualifyingHumanReviewAt: new Date('2026-03-02T02:00:00Z'),
        }),
      ],
      RANGE_8W,
    )
    const nonNull = out.filter((p) => p.medianHours !== null)
    expect(nonNull).toHaveLength(1)
    expect(nonNull[0].medianHours).toBe(2)
  })
})
