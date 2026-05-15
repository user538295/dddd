import { createFileRoute } from '@tanstack/react-router'

import { SyncSourcePage } from '~/components/sources/SyncSourcePage'
import { getSyncSourceData } from '~/server/source-functions'

export const Route = createFileRoute('/sources/sync')({
  loader: async () => await getSyncSourceData(),
  component: SyncSourcePage,
})
