import { describe, expect, it } from 'vitest'

import {
  computePrSizeMetric,
  getPrSizeWeeklyTrend,
  isoWeekStart,
} from '~/metrics/pr-size-metric'
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
    deletions: 50,
    changedFiles: 3,
    ...overrides,
  }
}

describe('computePrSizeMetric', () => {
  it('median_lines_excludes_null_size_prs', () => {
    const current = [
      pr({ additions: 100, deletions: 0 }),
      pr({ additions: null, deletions: null }),
      pr({ additions: 300, deletions: 0 }),
    ]
    const metric = computePrSizeMetric(current, [])
    expect(metric.medianLines).toBe(200)
    expect(metric.qualifyingPrCount).toBe(2)
  })

  it('median_changed_files_excludes_null_changed_files_independently', () => {
    const current = [
      pr({ additions: 10, deletions: 10, changedFiles: 4 }),
      pr({ additions: 30, deletions: 30, changedFiles: null }),
      pr({ additions: 50, deletions: 50, changedFiles: 8 }),
    ]
    const metric = computePrSizeMetric(current, [])
    expect(metric.medianChangedFiles).toBe(6)
    expect(metric.qualifyingPrCount).toBe(3)
  })

  it('median_lines_null_when_no_sized_prs', () => {
    const current = [pr({ additions: null, deletions: null })]
    const metric = computePrSizeMetric(current, [])
    expect(metric.medianLines).toBeNull()
    expect(metric.qualifyingPrCount).toBe(0)
  })

  it('trend_percent_computed_correctly', () => {
    const sized = (lines: number) =>
      pr({ additions: lines, deletions: 0, changedFiles: 1 })
    const current = [sized(120), sized(120), sized(120)]
    const prior = [sized(100), sized(100), sized(100)]
    const metric = computePrSizeMetric(current, prior)
    expect(metric.trendPercent).toBe(20)
  })

  it('trend_percent_rounds_to_one_decimal_place', () => {
    const sized = (lines: number) =>
      pr({ additions: lines, deletions: 0, changedFiles: 1 })
    const current = [sized(100), sized(100), sized(100)]
    const prior = [sized(300), sized(300), sized(300)]
    const metric = computePrSizeMetric(current, prior)
    expect(metric.trendPercent).toBe(-66.7)
  })

  it('trend_percent_null_when_fewer_than_3_qualifying_in_current', () => {
    const current = [
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
    ]
    const prior = [
      pr({ additions: 100, deletions: 0 }),
      pr({ additions: 100, deletions: 0 }),
      pr({ additions: 100, deletions: 0 }),
    ]
    const metric = computePrSizeMetric(current, prior)
    expect(metric.trendPercent).toBeNull()
  })

  it('trend_percent_null_when_fewer_than_3_qualifying_in_prior', () => {
    const current = [
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
    ]
    const prior = [
      pr({ additions: 100, deletions: 0 }),
      pr({ additions: 100, deletions: 0 }),
    ]
    const metric = computePrSizeMetric(current, prior)
    expect(metric.previousMedianLines).toBe(100)
    expect(metric.trendPercent).toBeNull()
  })

  it('trend_percent_null_when_prior_median_null', () => {
    const current = [
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
      pr({ additions: 120, deletions: 0 }),
    ]
    const metric = computePrSizeMetric(current, [])
    expect(metric.trendPercent).toBeNull()
  })

  it('trend_percent_null_when_previous_median_is_zero', () => {
    const zero = () => pr({ additions: 0, deletions: 0, changedFiles: 1 })
    const current = [zero(), zero(), zero()]
    const prior = [zero(), zero(), zero()]
    const metric = computePrSizeMetric(current, prior)
    expect(metric.previousMedianLines).toBe(0)
    expect(metric.trendPercent).toBeNull()
  })

  it('baseline_status_pending_when_3_prs_span_only_2_iso_weeks', () => {
    const current = [
      pr({ mergedAt: new Date('2026-03-02T12:00:00.000Z') }),
      pr({ mergedAt: new Date('2026-03-03T12:00:00.000Z') }),
      pr({ mergedAt: new Date('2026-03-09T12:00:00.000Z') }),
      pr({ mergedAt: new Date('2026-03-10T12:00:00.000Z') }),
    ]
    const metric = computePrSizeMetric(current, [])
    expect(metric.baselineStatus).toBe('pending')
  })

  it('baseline_status_available_when_prs_span_3_or_more_iso_weeks', () => {
    const current = [
      pr({ mergedAt: new Date('2026-03-02T12:00:00.000Z') }),
      pr({ mergedAt: new Date('2026-03-09T12:00:00.000Z') }),
      pr({ mergedAt: new Date('2026-03-16T12:00:00.000Z') }),
    ]
    const metric = computePrSizeMetric(current, [])
    expect(metric.baselineStatus).toBe('available')
  })
})

describe('getPrSizeWeeklyTrend', () => {
  const now = new Date('2026-03-18T12:00:00.000Z')

  it('weekly_trend_returns_null_for_empty_weeks', () => {
    const trend = getPrSizeWeeklyTrend([], 8, now)
    expect(trend).toHaveLength(8)
    expect(trend.every((p) => p.medianLines === null)).toBe(true)
  })

  it('weekly_trend_null_for_week_with_only_null_size_prs', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-10T12:00:00.000Z'),
          additions: null,
          deletions: null,
        }),
        pr({
          mergedAt: new Date('2026-03-11T12:00:00.000Z'),
          additions: null,
          deletions: null,
        }),
      ],
      8,
      now,
    )
    const weekWithNullOnly = trend.find((p) => p.weekStart === '2026-03-09')
    expect(weekWithNullOnly).toBeDefined()
    expect(weekWithNullOnly?.medianLines).toBeNull()
  })

  it('weekly_trend_buckets_correctly_by_iso_week', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-02T12:00:00.000Z'),
          additions: 40,
          deletions: 0,
        }),
        pr({
          mergedAt: new Date('2026-03-10T12:00:00.000Z'),
          additions: 100,
          deletions: 0,
        }),
      ],
      8,
      now,
    )
    const weekMar2 = trend.find((p) => p.weekStart === '2026-03-02')
    const weekMar10 = trend.find((p) => p.weekStart === '2026-03-09')
    expect(weekMar2?.medianLines).toBe(40)
    expect(weekMar10?.medianLines).toBe(100)
  })

  it('weekly_trend_returns_expanded_point_shape', () => {
    const trend = getPrSizeWeeklyTrend([pr()], 8, now)
    for (const point of trend) {
      expect(Object.keys(point).sort()).toEqual([
        'isPartialWeek',
        'measuredPrCount',
        'medianLines',
        'weekStart',
      ])
    }
  })

  it('weekly_trend_counts_only_prs_with_additions_and_deletions', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-10T12:00:00.000Z'),
          additions: 100,
          deletions: 0,
        }),
        pr({
          mergedAt: new Date('2026-03-11T12:00:00.000Z'),
          additions: null,
          deletions: null,
        }),
      ],
      8,
      now,
    )
    const week = trend.find((p) => p.weekStart === '2026-03-09')
    expect(week?.measuredPrCount).toBe(1)
  })

  it('weekly_trend_returns_configured_completed_weeks_without_current_when_current_empty', () => {
    const trend = getPrSizeWeeklyTrend(
      [pr({ mergedAt: new Date('2026-03-10T12:00:00.000Z') })],
      8,
      now,
    )
    expect(trend).toHaveLength(8)
    expect(trend.every((p) => p.isPartialWeek === false)).toBe(true)
  })

  it('weekly_trend_completed_window_ends_at_previous_utc_iso_week', () => {
    const trend = getPrSizeWeeklyTrend([], 8, now)
    const lastCompletedMonday = isoWeekStart(now)
    lastCompletedMonday.setUTCDate(lastCompletedMonday.getUTCDate() - 7)
    const y = lastCompletedMonday.getUTCFullYear()
    const m = String(lastCompletedMonday.getUTCMonth() + 1).padStart(2, '0')
    const d = String(lastCompletedMonday.getUTCDate()).padStart(2, '0')
    expect(trend[trend.length - 1]?.weekStart).toBe(`${y}-${m}-${d}`)
    expect(trend[trend.length - 1]?.weekStart).not.toBe('2026-03-16')
  })

  it('weekly_trend_respects_configured_completed_week_count', () => {
    const completedOnly = getPrSizeWeeklyTrend([], 4, now)
    expect(completedOnly).toHaveLength(4)

    const withPartial = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: now,
          additions: 10,
          deletions: 0,
        }),
      ],
      4,
      now,
      { includeCurrentPartial: true },
    )
    expect(withPartial).toHaveLength(5)
    expect(withPartial[4]?.isPartialWeek).toBe(true)
  })

  it('weekly_trend_does_not_append_current_partial_without_explicit_opt_in', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: now,
          additions: 50,
          deletions: 50,
        }),
      ],
      8,
      now,
    )
    expect(trend).toHaveLength(8)
    expect(trend.every((p) => p.isPartialWeek === false)).toBe(true)
  })

  it('weekly_trend_opt_in_does_not_append_current_partial_when_current_week_has_zero_measured_prs', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: now,
          additions: null,
          deletions: null,
        }),
      ],
      8,
      now,
      { includeCurrentPartial: true },
    )
    expect(trend).toHaveLength(8)
    expect(trend.every((p) => p.isPartialWeek === false)).toBe(true)
  })

  it('weekly_trend_appends_current_partial_week_when_measured_prs_exist', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: now,
          additions: 40,
          deletions: 0,
        }),
      ],
      8,
      now,
      { includeCurrentPartial: true },
    )
    expect(trend).toHaveLength(9)
    const partial = trend[trend.length - 1]
    expect(partial?.isPartialWeek).toBe(true)
    expect(partial?.weekStart).toBe('2026-03-16')
    expect(partial?.measuredPrCount).toBe(1)
    expect(partial?.medianLines).toBe(40)
  })

  it('weekly_trend_ignores_future_rows_after_now_in_current_week', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-17T12:00:00.000Z'),
          additions: 100,
          deletions: 0,
        }),
        pr({
          mergedAt: new Date('2026-03-19T12:00:00.000Z'),
          additions: 999,
          deletions: 0,
        }),
      ],
      8,
      now,
      { includeCurrentPartial: true },
    )
    const partial = trend[trend.length - 1]
    expect(partial?.measuredPrCount).toBe(1)
    expect(partial?.medianLines).toBe(100)
  })

  it('weekly_trend_includes_pr_merged_exactly_at_now_and_excludes_one_ms_after_now', () => {
    const atNow = getPrSizeWeeklyTrend(
      [pr({ mergedAt: now, additions: 10, deletions: 0 })],
      8,
      now,
      { includeCurrentPartial: true },
    )
    expect(atNow[atNow.length - 1]?.measuredPrCount).toBe(1)

    const afterNow = getPrSizeWeeklyTrend(
      [pr({ mergedAt: new Date(now.getTime() + 1), additions: 10, deletions: 0 })],
      8,
      now,
      { includeCurrentPartial: true },
    )
    expect(afterNow).toHaveLength(8)
  })

  it('weekly_trend_zero_line_pr_counts_as_measured', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-10T12:00:00.000Z'),
          additions: 0,
          deletions: 0,
        }),
      ],
      8,
      now,
    )
    const week = trend.find((p) => p.weekStart === '2026-03-09')
    expect(week?.measuredPrCount).toBe(1)
    expect(week?.medianLines).toBe(0)
  })

  it('weekly_trend_preserves_fractional_even_count_median', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-03-10T12:00:00.000Z'),
          additions: 1,
          deletions: 0,
        }),
        pr({
          mergedAt: new Date('2026-03-11T12:00:00.000Z'),
          additions: 2,
          deletions: 0,
        }),
      ],
      8,
      now,
    )
    const week = trend.find((p) => p.weekStart === '2026-03-09')
    expect(week?.medianLines).toBe(1.5)
  })

  it('weekly_trend_points_are_chronological_with_partial_last', () => {
    const trend = getPrSizeWeeklyTrend(
      [
        pr({ mergedAt: new Date('2026-01-05T12:00:00.000Z'), additions: 1, deletions: 0 }),
        pr({ mergedAt: now, additions: 99, deletions: 0 }),
      ],
      3,
      now,
      { includeCurrentPartial: true },
    )
    const starts = trend.map((p) => p.weekStart)
    expect(starts).toEqual([...starts].sort())
    expect(trend[trend.length - 1]?.isPartialWeek).toBe(true)
  })

  it('weekly_trend_completed_zero_count_week_is_null_gap', () => {
    const trend = getPrSizeWeeklyTrend([], 8, now)
    expect(trend.every((p) => p.medianLines === null && p.measuredPrCount === 0)).toBe(
      true,
    )
  })
})
