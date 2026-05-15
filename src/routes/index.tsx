import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '~/components/pages/HomePage'
import { getDashboardData } from '~/server/dashboard-functions'

export const Route = createFileRoute('/')({
  loader: async () => await getDashboardData({ data: {} }),
  component: HomePage,
})
