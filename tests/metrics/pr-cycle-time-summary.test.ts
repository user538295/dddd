import { describe, expect, it } from 'vitest'

import { getDashboardDateRanges } from '~/config/env'
import type { PullRequestRecord } from '~/metrics/pr-cycle-time'
import {
  comparePeriods,
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
