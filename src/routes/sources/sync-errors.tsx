import { createFileRoute } from '@tanstack/react-router'

import { SyncErrorsSourcePage } from '~/components/sources/SyncErrorsSourcePage'
import { getSyncErrorsSourceData } from '~/server/source-functions'

export const Route = createFileRoute('/sources/sync-errors')({
  loader: async () => await getSyncErrorsSourceData(),
  component: SyncErrorsSourcePage,
})
