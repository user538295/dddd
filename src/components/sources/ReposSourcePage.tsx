import { getRouteApi } from '@tanstack/react-router'

import { SourcePageLayout } from '~/components/sources/SourcePageLayout'

const route = getRouteApi('/sources/repos')

export function ReposSourcePage() {
  const { repoRoot, rows } = route.useLoaderData()

  return (
    <SourcePageLayout
      title="Scanned repositories"
      description={`Repositories discovered under ${repoRoot}. Ready repositories with active=true are included in PR cycle time metrics.`}
    >
      <p className="source-page__meta">
        {rows.length} repo{rows.length === 1 ? '' : 's'} scanned
      </p>
      {rows.length === 0 ? (
        <p className="source-page__empty">No repositories scanned yet.</p>
      ) : (
        <div className="source-page__table-wrap">
          <table className="source-page__table" aria-label="Scanned repositories">
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Status</th>
                <th>In metrics</th>
                <th>Remote</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.path}>
                  <td>{row.name}</td>
                  <td>{row.team ?? '—'}</td>
                  <td>{row.scanStatus}</td>
                  <td>{row.includedInMetrics ? 'Yes' : 'No'}</td>
                  <td className="source-page__external">
                    {row.remoteUrl ? (
                      <a href={row.remoteUrl} target="_blank" rel="noreferrer">
                        {row.remoteUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SourcePageLayout>
  )
}
