import { describe, expect, it } from 'vitest'

import { getDashboardDateRanges } from '~/config/env'
import type { PullRequestRecord } from '~/metrics/pr-cycle-time'
import {
  comparePeriods,
  getComparisonWeeklyMedianTrend,
  getWeeklyMedianTrend,
  median,
} from '~/metrics/pr-cycle-time-summary'

function pr(overrides: Partial<PullRequestRecord> = {}): PullRequestRecord {
  const openedAt = new Date('2026-01-01T10:00:00.000Z')
  return {
    id: '00000000-0000-4000-8000-000000000001',
    repositoryId: '00000000-0000-4000-8000-000000000002',
    githubNodeId: 'node-1',
    number: 1,
    title: 'PR-1',
    state: 'merged',
    isDraft: false,
    openedAt,
    githubUpdatedAt: new Date('2026-01-02T10:00:00.000Z'),
    mergedAt: new Date('2026-01-03T10:00:00.000Z'),
    url: 'https://github.com/o/r/pull/1',
    missingJiraKey: false,
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T09:00:00.000Z'),
    additions: null,
    deletions: null,
    changedFiles: null,
    mergeCommitSha: null,
    ...overrides,
  }
}

describe('median', () => {
  it('median_cycle_time_handles_odd_count', () => {
    expect(median([48, 24, 72])).toBe(48)
  })

  it('median_cycle_time_handles_even_count', () => {
    expect(median([24, 48, 72, 96])).toBe(60)
  })
})

describe('getWeeklyMedianTrend', () => {
  it('weekly_trend_returns_exactly_8_buckets', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current } = getDashboardDateRanges(now, 8)
    const trend = getWeeklyMedianTrend([], current)
    expect(trend).toHaveLength(8)
  })

  it('weekly_trend_includes_empty_weeks', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current } = getDashboardDateRanges(now, 8)
    const week0Start = new Date(current.from)
    const mergedMidWeek0 = new Date(week0Start.getTime() + 2 * 24 * 60 * 60 * 1000)
    const opened = new Date(mergedMidWeek0.getTime() - 48 * 60 * 60 * 1000)
    const trend = getWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000011',
          openedAt: opened,
          mergedAt: mergedMidWeek0,
        }),
      ],
      current,
    )
    expect(trend[0].medianHours).toBe(48)
    expect(trend.slice(1).every((p) => p.medianHours === null)).toBe(true)
  })

  it('range_filter_includes_current_start_and_end_boundaries', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current } = getDashboardDateRanges(now, 8)
    const atStart = new Date(current.from)
    const atEnd = new Date(current.to)
    const trend = getWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000021',
          openedAt: new Date(atStart.getTime() - 24 * 60 * 60 * 1000),
          mergedAt: atStart,
        }),
        pr({
          id: '00000000-0000-4000-8000-000000000022',
          openedAt: new Date(atEnd.getTime() - 24 * 60 * 60 * 1000),
          mergedAt: atEnd,
        }),
      ],
      current,
    )
    expect(trend[0].medianHours).toBe(24)
    expect(trend.some((p) => p.medianHours === 24)).toBe(true)
  })

  it('range_filter_excludes_future_merged_prs', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current } = getDashboardDateRanges(now, 8)
    const future = new Date(current.to.getTime() + 60 * 1000)
    const trend = getWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000031',
          openedAt: new Date(future.getTime() - 24 * 60 * 60 * 1000),
          mergedAt: future,
        }),
      ],
      current,
    )
    expect(trend.every((p) => p.medianHours === null)).toBe(true)
  })
})

describe('getComparisonWeeklyMedianTrend', () => {
  it('comparison_trend_returns_16_points_with_period_metadata', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)
    const trend = getComparisonWeeklyMedianTrend([], previous, current)

    expect(trend).toHaveLength(16)
    expect(trend.slice(0, 8).every((p) => p.period === 'previous')).toBe(true)
    expect(trend.slice(8).every((p) => p.period === 'current')).toBe(true)
    expect(trend.map((p) => p.bucketIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(trend[0]).toMatchObject({
      period: 'previous',
      bucketIndex: 1,
      bucketStart: previous.from.toISOString(),
      bucketLabel: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      medianHours: null,
    })
    expect(trend[7].bucketEnd).toBe(current.from.toISOString())
    expect(trend[8].bucketStart).toBe(current.from.toISOString())
    expect(trend[15].bucketEnd).toBe(current.to.toISOString())
  })

  it('comparison_trend_uses_range_week_count_for_non_default_ranges', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 4)
    const trend = getComparisonWeeklyMedianTrend([], previous, current)

    expect(trend).toHaveLength(8)
    expect(trend.slice(0, 4).every((p) => p.period === 'previous')).toBe(true)
    expect(trend.slice(4).every((p) => p.period === 'current')).toBe(true)
    expect(trend.map((p) => p.bucketIndex)).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
    expect(trend[3].bucketEnd).toBe(current.from.toISOString())
    expect(trend[4].bucketStart).toBe(current.from.toISOString())
    expect(trend[7].bucketEnd).toBe(current.to.toISOString())
  })

  it('comparison_trend_preserves_dashboard_boundary_semantics', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)
    const trend = getComparisonWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000041',
          openedAt: new Date(previous.from.getTime() - 10 * 60 * 60 * 1000),
          mergedAt: previous.from,
        }),
        pr({
          id: '00000000-0000-4000-8000-000000000042',
          openedAt: new Date(current.from.getTime() - 20 * 60 * 60 * 1000),
          mergedAt: current.from,
        }),
        pr({
          id: '00000000-0000-4000-8000-000000000043',
          openedAt: new Date(current.to.getTime() - 30 * 60 * 60 * 1000),
          mergedAt: current.to,
        }),
      ],
      previous,
      current,
    )

    expect(trend.filter((p) => p.medianHours !== null)).toHaveLength(3)
    expect(trend[0].medianHours).toBe(10)
    expect(trend[8].medianHours).toBe(20)
    expect(trend[15].medianHours).toBe(30)
  })

  it('comparison_trend_final_buckets_cover_local_day_remainder', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)
    const previousFinalBucket = new Date(previous.from)
    previousFinalBucket.setDate(previousFinalBucket.getDate() + 50)
    const currentFinalBucket = new Date(current.from)
    currentFinalBucket.setDate(currentFinalBucket.getDate() + 50)
    const trend = getComparisonWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000051',
          openedAt: new Date(previousFinalBucket.getTime() - 12 * 60 * 60 * 1000),
          mergedAt: previousFinalBucket,
        }),
        pr({
          id: '00000000-0000-4000-8000-000000000052',
          openedAt: new Date(currentFinalBucket.getTime() - 18 * 60 * 60 * 1000),
          mergedAt: currentFinalBucket,
        }),
      ],
      previous,
      current,
    )

    expect(trend[7].medianHours).toBe(12)
    expect(trend[15].medianHours).toBe(18)
  })

  it('comparison_trend_internal_bucket_boundaries_do_not_double_count', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)
    const currentSecondBucket = new Date(current.from)
    currentSecondBucket.setDate(currentSecondBucket.getDate() + 7)
    const trend = getComparisonWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000061',
          openedAt: new Date(currentSecondBucket.getTime() - 16 * 60 * 60 * 1000),
          mergedAt: currentSecondBucket,
        }),
      ],
      previous,
      current,
    )

    expect(trend[8].medianHours).toBeNull()
    expect(trend[9].medianHours).toBe(16)
  })

  it('comparison_trend_null_weeks_return_null_median', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)

    expect(getComparisonWeeklyMedianTrend([], previous, current).every((p) => p.medianHours === null)).toBe(true)
  })

  it('comparison_trend_skips_negative_or_unmerged_prs', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)
    const merged = new Date(current.from)
    const trend = getComparisonWeeklyMedianTrend(
      [
        pr({
          id: '00000000-0000-4000-8000-000000000071',
          openedAt: new Date(merged.getTime() + 60 * 60 * 1000),
          mergedAt: merged,
        }),
        pr({
          id: '00000000-0000-4000-8000-000000000072',
          openedAt: new Date(merged.getTime() - 5 * 60 * 60 * 1000),
          mergedAt: null,
        }),
      ],
      previous,
      current,
    )

    expect(trend.every((p) => p.medianHours === null)).toBe(true)
  })
})

describe('comparePeriods', () => {
  it('dashboard_baseline_pending_without_previous_data', () => {
    expect(
      comparePeriods({
        currentMedian: 10,
        previousMedian: null,
        previousMergedPrCount: 0,
      }),
    ).toEqual({ trendPercent: null, baselineStatus: 'pending' })
  })

  it('dashboard_baseline_pending_with_insufficient_previous_prs', () => {
    expect(
      comparePeriods({
        currentMedian: 10,
        previousMedian: 8,
        previousMergedPrCount: 2,
      }),
    ).toEqual({ trendPercent: null, baselineStatus: 'pending' })
  })

  it('dashboard_baseline_pending_with_zero_previous_median', () => {
    expect(
      comparePeriods({
        currentMedian: 10,
        previousMedian: 0,
        previousMergedPrCount: 5,
      }),
    ).toEqual({ trendPercent: null, baselineStatus: 'pending' })
  })

  it('dashboard_computes_previous_period_trend', () => {
    expect(
      comparePeriods({
        currentMedian: 10,
        previousMedian: 20,
        previousMergedPrCount: 5,
      }),
    ).toEqual({ trendPercent: -50, baselineStatus: 'available' })
  })
})
