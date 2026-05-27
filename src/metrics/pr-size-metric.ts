import { median } from '~/metrics/math'
import type { PrSizeRecord } from '~/metrics/pr-size-types'

export type PrSizeMetric = {
  medianLines: number | null
  medianChangedFiles: number | null
  previousMedianLines: number | null
  trendPercent: number | null
  baselineStatus: 'available' | 'pending'
  qualifyingPrCount: number
}

function hasSize(p: PrSizeRecord): boolean {
  return p.additions !== null && p.deletions !== null
}

function prLines(p: PrSizeRecord): number {
  return p.additions! + p.deletions!
}

function roundOneDecimal(n: number): number {
  return Math.round(n * 10) / 10
}

function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** ISO week key `YYYY-Www` for bucketing and baseline week counts. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function computePrSizeMetric(
  current: PrSizeRecord[],
  prior: PrSizeRecord[],
): PrSizeMetric {
  const currentSized = current.filter(hasSize)
  const priorSized = prior.filter(hasSize)

  const medianLines = median(currentSized.map(prLines))
  const medianChangedFiles = median(
    current.filter((p) => p.changedFiles !== null).map((p) => p.changedFiles as number),
  )
  const previousMedianLines = median(priorSized.map(prLines))
  const qualifyingPrCount = currentSized.length
  const priorQualifyingCount = priorSized.length

  const isoWeeks = new Set(currentSized.map((p) => isoWeekKey(p.mergedAt)))
  const baselineStatus = isoWeeks.size >= 3 ? 'available' : 'pending'

  let trendPercent: number | null = null
  if (
    medianLines !== null &&
    previousMedianLines !== null &&
    previousMedianLines !== 0 &&
    qualifyingPrCount >= 3 &&
    priorQualifyingCount >= 3
  ) {
    trendPercent = roundOneDecimal(
      ((medianLines - previousMedianLines) / previousMedianLines) * 100,
    )
  }

  return {
    medianLines,
    medianChangedFiles,
    previousMedianLines,
    trendPercent,
    baselineStatus,
    qualifyingPrCount,
  }
}

export type PrSizeWeeklyTrendPoint = {
  weekStart: string
  medianLines: number | null
  measuredPrCount: number
  isPartialWeek: boolean
}

function measuredLinesForWeek(
  prs: PrSizeRecord[],
  weekMonday: Date,
  now: Date,
  excludeMergedAfterNow: boolean,
): { medianLines: number | null; measuredPrCount: number } {
  const key = isoWeekKey(weekMonday)
  const lines: number[] = []

  for (const p of prs) {
    if (!hasSize(p)) continue
    if (isoWeekKey(p.mergedAt) !== key) continue
    if (excludeMergedAfterNow && p.mergedAt.getTime() > now.getTime()) continue
    lines.push(prLines(p))
  }

  return {
    measuredPrCount: lines.length,
    medianLines: lines.length === 0 ? null : median(lines),
  }
}

export function getPrSizeWeeklyTrend(
  prs: PrSizeRecord[],
  weeks: number,
  now: Date,
  options?: { includeCurrentPartial?: boolean },
): PrSizeWeeklyTrendPoint[] {
  const currentWeekStart = isoWeekStart(now)
  const points: PrSizeWeeklyTrendPoint[] = []

  for (let i = 0; i < weeks; i += 1) {
    const weekMonday = addUtcDays(currentWeekStart, -(weeks - i) * 7)
    const { medianLines, measuredPrCount } = measuredLinesForWeek(
      prs,
      weekMonday,
      now,
      false,
    )

    points.push({
      weekStart: formatUtcDate(weekMonday),
      medianLines,
      measuredPrCount,
      isPartialWeek: false,
    })
  }

  if (options?.includeCurrentPartial === true) {
    const partial = measuredLinesForWeek(prs, currentWeekStart, now, true)
    if (partial.measuredPrCount > 0) {
      points.push({
        weekStart: formatUtcDate(currentWeekStart),
        medianLines: partial.medianLines,
        measuredPrCount: partial.measuredPrCount,
        isPartialWeek: true,
      })
    }
  }

  return points
}
