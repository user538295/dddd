import type { PrSizeMetric } from '~/metrics/pr-cycle-time-dashboard'
import { CardHowToRead } from '~/components/dashboard/card-how-to-read'
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
      <p className="pr-dashboard__metric-sub">Lines changed per merged PR</p>
      <CardHowToRead>
        Total lines added and deleted per merged pull request (additions plus deletions). A rising median often
        means teams are shipping larger changes that are harder to review in one pass.
      </CardHowToRead>
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
      {isBaselinePending ? <p className="pr-dashboard__baseline">Baseline pending</p> : null}
      <div className="pr-dashboard__metric-footer">
        <IconMeasured />
        <span data-testid="pr-size-merged-count">
          {metric.qualifyingPrCount} merged PR{metric.qualifyingPrCount === 1 ? '' : 's'} measured
        </span>
      </div>
      {metric.medianChangedFiles !== null ? (
        <p className="pr-dashboard__metric-files" data-testid="median-files-changed">
          Median files changed: {metric.medianChangedFiles}
        </p>
      ) : null}
    </section>
  )
}

function IconMeasured() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4 3.5h10a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
