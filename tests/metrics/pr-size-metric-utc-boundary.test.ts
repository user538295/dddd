import { describe, expect, it } from 'vitest'

import { getPrSizeWeeklyTrend } from '~/metrics/pr-size-metric'
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

function weekPoint(
  trend: ReturnType<typeof getPrSizeWeeklyTrend>,
  weekStart: string,
) {
  return trend.find((p) => p.weekStart === weekStart)
}

/**
 * Bucketing must use UTC calendar fields. Under America/Los_Angeles, Monday
 * 00:00:00.000Z is still the prior local calendar day — wrong local-Date code
 * buckets into the previous week.
 *
 * Run: TZ=America/Los_Angeles npm run test -- tests/metrics/pr-size-metric-utc-boundary.test.ts
 */
describe('getPrSizeWeeklyTrend UTC ISO week boundaries', () => {
  it('harness_uses_non_utc_timezone_when_tz_env_is_set', () => {
    if (!process.env.TZ) return
    expect(process.env.TZ).not.toMatch(/^(UTC|Etc\/UTC)$/i)
    expect(new Date().getTimezoneOffset()).not.toBe(0)
  })

  it('weekly_trend_buckets_sunday_utc_boundary_under_non_utc_tz', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-05-31T23:59:59.999Z'),
          additions: 10,
          deletions: 0,
        }),
      ],
      8,
      now,
    )

    expect(weekPoint(trend, '2026-05-25')?.measuredPrCount).toBe(1)
    expect(weekPoint(trend, '2026-06-01')?.measuredPrCount ?? 0).toBe(0)
  })

  it('weekly_trend_buckets_monday_utc_boundary_under_non_utc_tz', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2026-06-01T00:00:00.000Z'),
          additions: 10,
          deletions: 0,
        }),
      ],
      8,
      now,
    )

    expect(weekPoint(trend, '2026-06-01')?.measuredPrCount).toBe(1)
    expect(weekPoint(trend, '2026-05-25')?.measuredPrCount ?? 0).toBe(0)
  })

  it('weekly_trend_buckets_iso_year_rollover_sunday_under_non_utc_tz', () => {
    const now = new Date('2025-01-15T12:00:00.000Z')
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2024-12-29T23:59:59.999Z'),
          additions: 10,
          deletions: 0,
        }),
      ],
      8,
      now,
    )

    expect(weekPoint(trend, '2024-12-23')?.measuredPrCount).toBe(1)
    expect(weekPoint(trend, '2024-12-30')?.measuredPrCount ?? 0).toBe(0)
  })

  it('weekly_trend_buckets_iso_year_rollover_monday_under_non_utc_tz', () => {
    const now = new Date('2025-01-15T12:00:00.000Z')
    const trend = getPrSizeWeeklyTrend(
      [
        pr({
          mergedAt: new Date('2024-12-30T00:00:00.000Z'),
          additions: 10,
          deletions: 0,
        }),
      ],
      8,
      now,
    )

    expect(weekPoint(trend, '2024-12-30')?.measuredPrCount).toBe(1)
    expect(weekPoint(trend, '2024-12-23')?.measuredPrCount ?? 0).toBe(0)
  })
})
