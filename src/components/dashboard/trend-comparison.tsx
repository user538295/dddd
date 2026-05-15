import type { ReactNode } from 'react'

import { formatPreviousMedianReference } from '~/components/dashboard/format-cycle-duration'

export type TrendComparisonProps = {
  trendPercent: number | null
  previousMedianHours: number | null
  baselinePendingLabel?: string
  className?: string
  size?: 'metric' | 'table'
}

function cellClassName(up: boolean, size: 'metric' | 'table'): string {
  if (size === 'metric') {
    return up ? 'pr-dashboard__metric-trend--up' : 'pr-dashboard__metric-trend--down'
  }
  return up ? 'pr-dashboard__trend-cell--warn' : 'pr-dashboard__trend-cell--good'
}

export function TrendComparison({
  trendPercent,
  previousMedianHours,
  baselinePendingLabel = '— baseline pending',
  className,
  size = 'table',
}: TrendComparisonProps): ReactNode {
  if (trendPercent == null) {
    const label = previousMedianHours == null ? '—' : baselinePendingLabel
    return <span className="pr-dashboard__trend-cell--muted">{label}</span>
  }

  const up = trendPercent > 0
  const arrow = up ? '↑' : '↓'
  const sign = trendPercent > 0 ? '+' : ''
  const prevLabel = formatPreviousMedianReference(previousMedianHours)

  if (size === 'metric') {
    return (
      <MetricTrendBlock
        className={className}
        up={up}
        arrow={arrow}
        sign={sign}
        trendPercent={trendPercent}
        prevLabel={prevLabel}
      />
    )
  }

  return (
    <span className={`pr-dashboard__trend-stack ${className ?? ''}`.trim()}>
      <span className={cellClassName(up, size)}>
        {arrow} {sign}
        {trendPercent.toFixed(0)}%
      </span>
      <span className="pr-dashboard__trend-prev">({prevLabel})</span>
    </span>
  )
}

function MetricTrendBlock({
  className,
  up,
  arrow,
  sign,
  trendPercent,
  prevLabel,
}: {
  className?: string
  up: boolean
  arrow: string
  sign: string
  trendPercent: number
  prevLabel: string
}) {
  return (
    <div className={`pr-dashboard__metric-trend ${cellClassName(up, 'metric')} ${className ?? ''}`.trim()}>
      <div className="pr-dashboard__metric-trend-main">
        <span className="pr-dashboard__metric-trend-arrow">{arrow}</span>
        <span className="pr-dashboard__metric-trend-pct">
          {sign}
          {trendPercent.toFixed(0)}%
        </span>
      </div>
      <span className="pr-dashboard__trend-prev">({prevLabel})</span>
    </div>
  )
}
