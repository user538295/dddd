import type { DateRange } from '~/config/env'

import { calculatePrCycleTime, type PullRequestRecord } from '~/metrics/pr-cycle-time'

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

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid]
  }
  return (sorted[mid - 1] + sorted[mid]) / 2
}

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
