import type { PrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'

import { formatCycleDuration } from '~/components/dashboard/format-cycle-duration'

export type PrCycleTimeDashboardProps = {
  data: PrCycleTimeDashboard
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
  refreshError?: string | null
}

function formatTrendPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

export function PrCycleTimeDashboard({
  data,
  onRefresh,
  refreshing = false,
  refreshError = null,
}: PrCycleTimeDashboardProps) {
  const noRepos = data.freshness.reposScanned === 0
  const noMerged = !noRepos && data.metric.mergedPrCount === 0
  const baselinePending = data.metric.baselineStatus === 'pending'
  const syncFailed = data.freshness.latestSyncStatus === 'failed'
  const syncPartial = data.freshness.latestSyncStatus === 'partial'

  return (
    <div className="pr-dashboard">
      <header className="pr-dashboard__header">
        <h1>Engineering Decision Dashboard</h1>
        <div className="pr-dashboard__header-meta">
          <span>Last {data.range.weeks} weeks</span>
          <span>Local data</span>
          {onRefresh ? (
            <button type="button" onClick={() => void onRefresh()} disabled={refreshing}>
              {refreshing ? 'Refreshing local data' : 'Refresh'}
            </button>
          ) : null}
        </div>
      </header>

      {refreshError ? (
        <div className="pr-dashboard__error" role="alert">
          {refreshError}
          <button type="button" onClick={() => void onRefresh?.()}>
            Retry
          </button>
        </div>
      ) : null}

      <section aria-labelledby="metric-heading" className="pr-dashboard__metric">
        <h2 id="metric-heading">Median PR Cycle Time</h2>
        <div className="pr-dashboard__metric-value" data-testid="median-pr-cycle-time">
          {noRepos ? (
            <span>No repositories discovered</span>
          ) : noMerged ? (
            <span>No merged PRs in range</span>
          ) : (
            <span>{formatCycleDuration(data.metric.medianHours)}</span>
          )}
        </div>
        {baselinePending && !noRepos ? <p className="pr-dashboard__baseline">Baseline pending</p> : null}
        {syncFailed ? <p className="pr-dashboard__sync-failed">Sync failed</p> : null}
      </section>

      <section aria-labelledby="exceptions-heading" className="pr-dashboard__exceptions">
        <h2 id="exceptions-heading">Exceptions</h2>
        {data.exceptions.length === 0 ? (
          <p>None</p>
        ) : (
          <ul>
            {data.exceptions.map((e) => (
              <li key={`${e.type}-${e.team}-${e.message}`}>
                <strong>{e.team}</strong>: {e.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trend-heading" className="pr-dashboard__trend">
        <h2 id="trend-heading">8-week trend</h2>
        <ol data-testid="weekly-trend-list">
          {data.weeklyTrend.map((p) => (
            <li key={p.weekStart}>
              <span>{p.weekStart}</span>:{' '}
              {p.medianHours === null ? <span>empty</span> : <span>{formatCycleDuration(p.medianHours)}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="teams-heading" className="pr-dashboard__teams">
        <h2 id="teams-heading">Team breakdown</h2>
        <table aria-label="Team breakdown">
          <thead>
            <tr>
              <th>Team</th>
              <th>Merged PRs</th>
              <th>Median</th>
              <th>Trend</th>
              <th>Longest open</th>
            </tr>
          </thead>
          <tbody>
            {data.teamBreakdown.map((row) => (
              <tr key={row.team}>
                <td>{row.team}</td>
                <td>{row.mergedPrs}</td>
                <td>{formatCycleDuration(row.medianHours)}</td>
                <td>{formatTrendPercent(row.trendPercent)}</td>
                <td>{row.longestOpenPrHours === null ? '—' : formatCycleDuration(row.longestOpenPrHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="pr-dashboard__freshness" data-testid="data-freshness">
        <span>Repos scanned: {data.freshness.reposScanned}</span>
        <span>PR metadata synced: {data.freshness.prMetadataSyncedAt ?? 'never'}</span>
        <span>PRs missing Jira key: {data.freshness.prsMissingJiraKey}</span>
        <span>Sync errors: {data.freshness.syncErrors}</span>
        <span>Latest sync: {data.freshness.latestSyncStatus}</span>
        {syncPartial ? <span className="pr-dashboard__partial-note">Partial sync: review sync errors above.</span> : null}
      </footer>

      <aside className="pr-dashboard__future-guard" aria-hidden="true">
        {/* Intentionally empty: no future KPI placeholders */}
      </aside>
    </div>
  )
}
