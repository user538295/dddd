import type { FirstReviewMetric } from '~/metrics/pr-cycle-time-dashboard'
import { formatCycleDuration } from '~/components/dashboard/format-cycle-duration'
import { CardHowToRead } from '~/components/dashboard/card-how-to-read'
import { TrendComparison } from '~/components/dashboard/trend-comparison'

type Props = {
  metric: FirstReviewMetric
}

function formatHours(h: number | null): string {
  if (h === null) return '—'
  return formatCycleDuration(h)
}

export function FirstReviewCard({ metric }: Props) {
  const N = metric.mergedPrCountInSyncedRepos
  const M = metric.qualifyingPrCount
  const showCoverage = N > 0
  const isBaselinePending = metric.baselineStatus === 'pending' && metric.qualifyingPrCount > 0

  let body: string | null
  if (N === 0) body = 'No merged PRs in range'
  else if (M === 0) body = 'No merged PRs with a human review in range'
  else body = null

  return (
    <section
      className="pr-dashboard__card pr-dashboard__metric"
      data-testid="first-review-card"
      aria-label="Median First Review Time"
    >
      <h3 className="pr-dashboard__card-title">Median First Review Time</h3>
      {showCoverage ? <p className="pr-dashboard__metric-sub">PR opened to first human review</p> : null}
      <CardHowToRead>
        Elapsed time from when a pull request is opened until the first submitted human review. A high median often
        means PRs are waiting before review starts.
      </CardHowToRead>
      <div className="pr-dashboard__metric-row">
        <p className="pr-dashboard__metric-value" data-testid="median-first-review-time">
          {formatHours(metric.medianHours)}
        </p>
        {M > 0 && metric.trendPercent !== null ? (
          <div className="pr-dashboard__metric-trend-wrap">
            <TrendComparison
              size="metric"
              trendPercent={metric.trendPercent}
              previousMedianHours={metric.previousMedianHours}
            />
            <span className="pr-dashboard__metric-trend-sub">vs previous 8 weeks</span>
          </div>
        ) : null}
      </div>
      {body ? <p className="pr-dashboard__baseline">{body}</p> : null}
      {showCoverage ? <p className="pr-dashboard__sr-only">{`Median over ${M} of ${N} merged PRs with a human review`}</p> : null}
      {isBaselinePending ? <p className="pr-dashboard__baseline">Baseline pending</p> : null}
      {metric.botShare ? (
        <p className="pr-dashboard__baseline">
          {`Bots: ${metric.botShare.botReviewCount} reviews (${Math.round(
            (metric.botShare.botReviewCount /
              (metric.botShare.botReviewCount + metric.botShare.humanReviewCount)) *
              100,
          )}% of qualifying reviews), first-review by bot on ${metric.botShare.firstReviewByBotCount} PRs`}
        </p>
      ) : null}
      {showCoverage ? (
        <div className="pr-dashboard__metric-footer">
          <IconReview />
          <span>{M} reviewed PR{M === 1 ? '' : 's'} analyzed</span>
        </div>
      ) : null}
    </section>
  )
}

function IconReview() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="13" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.2 5h2.3a3 3 0 013 3v1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.2 13h3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.5 11.5l1.2 1.2 2.1-2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
