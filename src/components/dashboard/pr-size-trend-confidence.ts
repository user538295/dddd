export type PrSizeTrendPoint = {
  weekStart: string
  medianLines: number | null
  measuredPrCount: number
  isPartialWeek: boolean
}

function weekOfLabel(weekStart: string): string {
  return `Week of ${weekStart}`
}

function measuredPrLabel(count: number): string {
  return `${count} measured PR${count === 1 ? '' : 's'}`
}

export function buildCurrentPartialConfidenceCopy(point: PrSizeTrendPoint): string {
  const prefix = `${weekOfLabel(point.weekStart)} so far: ${measuredPrLabel(point.measuredPrCount)}`
  if (point.measuredPrCount < 3) {
    return `${prefix}. Low sample. This value may change.`
  }
  return `${prefix}. This value may change.`
}

export function buildCompletedLowSampleConfidenceCopy(point: PrSizeTrendPoint): string {
  return `${weekOfLabel(point.weekStart)}: ${measuredPrLabel(point.measuredPrCount)}. Low sample.`
}

export function findCompletedLowSamplePoint(completed: PrSizeTrendPoint[]): PrSizeTrendPoint | null {
  for (let i = completed.length - 1; i >= 0; i -= 1) {
    const p = completed[i]!
    if (p.measuredPrCount === 0) continue
    if (p.measuredPrCount <= 2) return p
    return null
  }
  return null
}

export function formatMedianLines(value: number): string {
  return Number.isInteger(value) ? `${value} lines` : `${value} lines`
}

export { measuredPrLabel }
