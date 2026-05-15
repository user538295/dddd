import { getRouteApi } from '@tanstack/react-router'

import { formatCycleDuration } from '~/components/dashboard/format-cycle-duration'
import { SourcePageLayout } from '~/components/sources/SourcePageLayout'

const route = getRouteApi('/sources/merged-prs')

export function MergedPrsSourcePage() {
  const { range, rows } = route.useLoaderData()

  return (
    <SourcePageLayout
      title="Merged pull requests"
      description={`PRs merged between ${range.from.slice(0, 10)} and ${range.to.slice(0, 10)} (last ${range.weeks} weeks). These rows feed the median PR cycle time on the dashboard.`}
    >
      <p className="source-page__meta">
        {rows.length} merged PR{rows.length === 1 ? '' : 's'} in range
      </p>
      {rows.length === 0 ? (
        <p className="source-page__empty">No merged pull requests in this range.</p>
      ) : (
        <div className="source-page__table-wrap">
          <table className="source-page__table" aria-label="Merged pull requests">
            <thead>
              <tr>
                <th>PR</th>
                <th>Repository</th>
                <th>Team</th>
                <th>Merged</th>
                <th>Cycle time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.repositoryName}-${row.mergedAt}-${row.title}`}>
                  <td className="source-page__external">
                    <a href={row.url} target="_blank" rel="noreferrer">
                      {row.title}
                    </a>
                  </td>
                  <td>{row.repositoryName}</td>
                  <td>{row.team ?? '—'}</td>
                  <td>{row.mergedAt.slice(0, 10)}</td>
                  <td>{row.cycleTimeHours == null ? '—' : formatCycleDuration(row.cycleTimeHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SourcePageLayout>
  )
}
