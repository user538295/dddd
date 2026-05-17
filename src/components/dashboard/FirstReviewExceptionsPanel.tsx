import type { FirstReviewException, FirstReviewTeamRow } from '~/metrics/pr-cycle-time-dashboard'
import { CardHowToRead } from '~/components/dashboard/card-how-to-read'
import { formatCycleDuration } from '~/components/dashboard/format-cycle-duration'

type Props = {
  exceptions: FirstReviewException[]
  teamBreakdown?: FirstReviewTeamRow[]
}

function title(e: FirstReviewException): string {
  if (e.type === 'review_latency_worsened') return `${e.team} review latency worsened`
  if (e.type === 'merge_without_review') return `${e.team} merged without review`
  return `${e.team} review baseline pending`
}

function metric(e: FirstReviewException, rows: FirstReviewTeamRow[]): string {
  if (e.type === 'review_latency_worsened') {
    const row = rows.find((r) => r.team === e.team)
    return row?.medianHours == null ? '—' : `${formatCycleDuration(row.medianHours)} median`
  }
  if (e.type === 'merge_without_review') {
    const count = e.prDetails?.length ?? e.count ?? 0
    return `${count} PR${count === 1 ? '' : 's'} without review`
  }
  return 'Not enough prior review data'
}

function recommendation(e: FirstReviewException): string {
  if (e.type === 'review_latency_worsened') return 'Start reviews earlier on the affected team'
  if (e.type === 'merge_without_review') return 'Check fast merges for intentional review policy exceptions'
  return 'Collect more reviewed PRs before comparing trends'
}

function trend(e: FirstReviewException) {
  if (e.trendPercent == null || e.type !== 'review_latency_worsened') return null
  const up = e.trendPercent > 0
  return (
    <span className={`pr-dashboard__exception-trend ${up ? 'pr-dashboard__exception-trend--warn' : 'pr-dashboard__trend-cell--good'}`}>
      {up ? '↑' : '↓'} {e.trendPercent > 0 ? '+' : ''}
      {e.trendPercent.toFixed(0)}%
    </span>
  )
}

export function FirstReviewExceptionsPanel({ exceptions, teamBreakdown = [] }: Props) {
  return (
    <section className="pr-dashboard__card" data-testid="first-review-exceptions" aria-label="Review-latency exceptions">
      <h3 className="pr-dashboard__card-title">Review-latency exceptions</h3>
      <CardHowToRead>
        Teams that may need attention in this range: first review latency regressed, PRs merged without qualifying
        review, or not enough prior-period reviewed PRs exist to compare trends.
      </CardHowToRead>
      {exceptions.length === 0 ? (
        <p className="pr-dashboard__exception-empty">None in this range</p>
      ) : (
        <ul className="pr-dashboard__exception-list">
          {exceptions.map((e) => (
            <li key={`${e.type}-${e.team}-${e.message}`} className="pr-dashboard__exception-row" data-exception-type={e.type}>
              {e.severity === 'warning' ? (
                <IconWarning className="pr-dashboard__exception-icon" />
              ) : (
                <IconInfo className="pr-dashboard__exception-icon" />
              )}
              <div className="pr-dashboard__exception-body">
                <div className="pr-dashboard__exception-title-row">
                  <span className="pr-dashboard__exception-title">{title(e)}</span>
                  <span className="pr-dashboard__exception-metric">{metric(e, teamBreakdown)}</span>
                  {trend(e)}
                </div>
                <p className="pr-dashboard__exception-recommendation">{recommendation(e)}</p>
                <p className="pr-dashboard__sr-only">{e.message}</p>
                {e.prDetails && e.prDetails.length > 0 ? (
                  <ul className="pr-dashboard__review-pr-details">
                    {e.prDetails.map((d) => (
                      <li key={`${d.repo}-${d.prNumber}`}>
                        <span className="pr-dashboard__review-pr-title">{d.title}</span>
                        <span className="pr-dashboard__review-pr-repo">{d.repo}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4L3 18h16L11 4z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 9v4M11 16h.01" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="1.4" />
      <path d="M11 10v5M11 7h.01" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
