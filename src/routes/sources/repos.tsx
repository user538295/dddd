import { createFileRoute } from '@tanstack/react-router'

import { ReposSourcePage } from '~/components/sources/ReposSourcePage'
import { getReposSourceData } from '~/server/source-functions'

export const Route = createFileRoute('/sources/repos')({
  loader: async () => await getReposSourceData({ data: {} }),
  component: ReposSourcePage,
})
