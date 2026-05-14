import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { PrCycleTimeDashboard } from '~/components/dashboard/PrCycleTimeDashboard'
import { getDashboardData, refreshLocalDataFn } from '~/server/dashboard-functions'

export const Route = createFileRoute('/')({
  loader: async () => await getDashboardData({ data: {} }),
  component: Home,
})

export function Home() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const refreshFn = useServerFn(refreshLocalDataFn)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const onRefresh = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await refreshFn()
      if (!res.ok) {
        setRefreshError(res.message)
        return
      }
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main>
      <PrCycleTimeDashboard
        data={data}
        onRefresh={onRefresh}
        refreshing={refreshing}
        refreshError={refreshError}
      />
    </main>
  )
}
