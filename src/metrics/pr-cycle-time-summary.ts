import type { DateRange } from '~/config/env'

import { calculatePrCycleTime, type PullRequestRecord } from '~/metrics/pr-cycle-time'
import { median } from '~/metrics/math'

function addCalendarDays(d: Date, deltaDays: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + deltaDays)
  return x
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type WeeklyMedianPoint = {
  weekStart: string
  medianHours: number | null
}

export type PrCycleTimeTrendPeriod = 'previous' | 'current'

export type PrCycleTimeComparisonTrendPoint = {
  period: PrCycleTimeTrendPeriod
  bucketIndex: number
  bucketStart: string
  bucketEnd: string
  bucketLabel: string
  medianHours: number | null
}

export { median }

export function getWeeklyMedianTrend(prs: PullRequestRecord[], range: DateRange): WeeklyMedianPoint[] {
  const fromMs = range.from.getTime()
  const toMs = range.to.getTime()
  const points: WeeklyMedianPoint[] = []

  for (let i = 0; i < range.weeks; i += 1) {
    const weekStart = addCalendarDays(range.from, i * 7)
    const weekEnd = addCalendarDays(range.from, (i + 1) * 7)
    const weekStartMs = weekStart.getTime()
    const weekEndMs = weekEnd.getTime()
    const hoursInWeek: number[] = []

    for (const p of prs) {
      if (p.mergedAt == null) {
        continue
      }
      const mergedMs = p.mergedAt.getTime()
      if (mergedMs < fromMs || mergedMs > toMs) {
        continue
      }
      if (mergedMs < weekStartMs || mergedMs >= weekEndMs) {
        continue
      }
      const cycle = calculatePrCycleTime(p)
      if (cycle == null) {
        continue
      }
      hoursInWeek.push(cycle.cycleTimeHours)
    }

    points.push({
      weekStart: formatLocalDate(weekStart),
      medianHours: median(hoursInWeek),
    })
  }

  return points
}

export function getComparisonWeeklyMedianTrend(
  prs: PullRequestRecord[],
  previous: DateRange,
  current: DateRange,
): PrCycleTimeComparisonTrendPoint[] {
  const points: PrCycleTimeComparisonTrendPoint[] = []

  const appendPeriod = (period: PrCycleTimeTrendPeriod, periodStart: Date, periodEnd: Date) => {
    for (let i = 0; i < 8; i += 1) {
      const bucketStart = addCalendarDays(periodStart, i * 7)
      const bucketEnd = i === 7 ? new Date(periodEnd) : addCalendarDays(periodStart, (i + 1) * 7)
      const bucketStartMs = bucketStart.getTime()
      const bucketEndMs = bucketEnd.getTime()
      const isFinalCurrentBucket = period === 'current' && i === 7
      const hoursInBucket: number[] = []

      for (const p of prs) {
        if (p.mergedAt == null) {
          continue
        }
        const mergedMs = p.mergedAt.getTime()
        const inBucket = isFinalCurrentBucket
          ? mergedMs >= bucketStartMs && mergedMs <= bucketEndMs
          : mergedMs >= bucketStartMs && mergedMs < bucketEndMs
        if (!inBucket) {
          continue
        }
        const cycle = calculatePrCycleTime(p)
        if (cycle == null) {
          continue
        }
        hoursInBucket.push(cycle.cycleTimeHours)
      }

      points.push({
        period,
        bucketIndex: i + 1,
        bucketStart: bucketStart.toISOString(),
        bucketEnd: bucketEnd.toISOString(),
        bucketLabel: formatLocalDate(bucketStart),
        medianHours: median(hoursInBucket),
      })
    }
  }

  appendPeriod('previous', previous.from, current.from)
  appendPeriod('current', current.from, current.to)

  return points
}

export function comparePeriods(input: {
  currentMedian: number | null
  previousMedian: number | null
  previousMergedPrCount: number
}): { trendPercent: number | null; baselineStatus: 'available' | 'pending' } {
  const baselinePending =
    input.previousMergedPrCount < 3 ||
    input.previousMedian === null ||
    input.previousMedian === 0

  if (baselinePending) {
    return { trendPercent: null, baselineStatus: 'pending' }
  }

  if (input.currentMedian === null) {
    return { trendPercent: null, baselineStatus: 'available' }
  }

  const trendPercent =
    ((input.currentMedian - input.previousMedian!) / input.previousMedian!) * 100

  return { trendPercent, baselineStatus: 'available' }
}
