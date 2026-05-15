import { getRouteApi } from '@tanstack/react-router'

import { SourcePageLayout } from '~/components/sources/SourcePageLayout'

const route = getRouteApi('/sources/sync')

export function SyncSourcePage() {
  const syncRun = route.useLoaderData()

  return (
    <SourcePageLayout
      title="GitHub PR metadata sync"
      description="Latest completed collector refresh that synced pull request metadata from GitHub into the local database."
    >
      {syncRun == null ? (
        <p className="source-page__empty">No sync has completed yet. Use Refresh on the dashboard to run a sync.</p>
      ) : (
        <dl className="source-page__meta">
          <dt>Status</dt>
          <dd>{syncRun.status}</dd>
          <dt>Started</dt>
          <dd>{syncRun.startedAt}</dd>
          <dt>Finished</dt>
          <dd>{syncRun.finishedAt ?? '—'}</dd>
          <dt>Errors recorded</dt>
          <dd>{syncRun.errorCount}</dd>
          {syncRun.message ? (
            <>
              <dt>Message</dt>
              <dd>{syncRun.message}</dd>
            </>
          ) : null}
        </dl>
      )}
    </SourcePageLayout>
  )
}
