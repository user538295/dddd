import type { FirstReviewMetric } from '~/metrics/pr-cycle-time-dashboard'

type Props = {
  metric: FirstReviewMetric
}

function formatHours(h: number | null): string {
  if (h === null) return '—'
  return `${h.toFixed(1)}h`
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
    <section data-testid="first-review-card" aria-label="Median First Review Time">
      <h2>Median First Review Time</h2>
      {showCoverage ? <p className="subtitle">PR opened to first human review</p> : null}
      <p className="value">{formatHours(metric.medianHours)}</p>
      {body ? <p className="body">{body}</p> : null}
      {showCoverage ? (
        <p className="coverage">{`Median over ${M} of ${N} merged PRs with a human review`}</p>
      ) : null}
      {isBaselinePending ? <p className="baseline-pending">Baseline pending</p> : null}
      {metric.botShare ? (
        <p className="bot-share">
          {`Bots: ${metric.botShare.botReviewCount} reviews (${Math.round(
            (metric.botShare.botReviewCount /
              (metric.botShare.botReviewCount + metric.botShare.humanReviewCount)) *
              100,
          )}% of qualifying reviews), first-review by bot on ${metric.botShare.firstReviewByBotCount} PRs`}
        </p>
      ) : null}
    </section>
  )
}
