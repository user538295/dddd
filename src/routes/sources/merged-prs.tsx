import { createFileRoute } from '@tanstack/react-router'

import { MergedPrsSourcePage } from '~/components/sources/MergedPrsSourcePage'
import { getMergedPrsSourceData } from '~/server/source-functions'

export const Route = createFileRoute('/sources/merged-prs')({
  loader: async () => await getMergedPrsSourceData({ data: {} }),
  component: MergedPrsSourcePage,
})
