import type { PrSizeMetric } from '~/metrics/pr-cycle-time-dashboard'
import { TrendComparison } from '~/components/dashboard/trend-comparison'

type Props = {
  metric: PrSizeMetric
}

function formatMedianLines(lines: number | null): string {
  if (lines === null) return '—'
  return `${lines} lines`
}

function formatPreviousMedianLines(lines: number | null): string {
  if (lines === null) return '—'
  return `${lines} lines`
}

export function PrSizeCard({ metric }: Props) {
  const isBaselinePending = metric.baselineStatus === 'pending'
  const showTrend = !isBaselinePending && metric.trendPercent !== null

  return (
    <section
      className="pr-dashboard__card pr-dashboard__metric"
      data-testid="pr-size-card"
      aria-label="Median PR Size"
    >
      <h3 className="pr-dashboard__card-title">Median PR Size</h3>
      <div className="pr-dashboard__metric-row">
        <p className="pr-dashboard__metric-value" data-testid="median-pr-size">
          {formatMedianLines(metric.medianLines)}
        </p>
        {showTrend ? (
          <div className="pr-dashboard__metric-trend-wrap">
            <TrendComparison
              size="metric"
              trendPercent={metric.trendPercent}
              previousMedianHours={metric.previousMedianLines}
              formatPreviousMedian={formatPreviousMedianLines}
            />
            <span className="pr-dashboard__metric-trend-sub">vs previous 8 weeks</span>
          </div>
        ) : null}
      </div>
      {metric.medianChangedFiles !== null ? (
        <p className="pr-dashboard__metric-sub">across {metric.medianChangedFiles} files</p>
      ) : null}
      {isBaselinePending ? <p className="pr-dashboard__baseline">Baseline pending</p> : null}
      <div className="pr-dashboard__metric-footer">
        <span>
          Across {metric.qualifyingPrCount} PR{metric.qualifyingPrCount === 1 ? '' : 's'}
        </span>
      </div>
    </section>
  )
}
