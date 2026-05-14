import { createServerFn } from '@tanstack/react-start'

import { refreshLocalData, type RefreshSummary } from '~/collector/refresh'
import { getEnv } from '~/config/env'
import { createDb } from '~/db/client'
import { getPrCycleTimeDashboard, type PrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'

export function parseDashboardWeeksInput(raw: unknown): { weeks?: number } {
  if (raw === undefined || raw === null) {
    return {}
  }
  if (typeof raw !== 'object') {
    throw new Error('Invalid input')
  }
  const data = raw as { weeks?: number }
  if (data.weeks === undefined) {
    return {}
  }
  if (typeof data.weeks !== 'number' || !Number.isInteger(data.weeks) || data.weeks <= 0) {
    throw new Error('weeks must be a positive integer')
  }
  return { weeks: data.weeks }
}

export async function loadDashboardPayload(weeks?: number, now?: Date): Promise<PrCycleTimeDashboard> {
  const env = getEnv()
  const db = createDb(env.databaseUrl)
  try {
    const w = weeks ?? env.defaultRangeWeeks
    return await getPrCycleTimeDashboard({ db, weeks: w, now })
  } finally {
    await db.$client.end({ timeout: 5 })
  }
}

export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) => parseDashboardWeeksInput(raw ?? {}))
  .handler(async ({ data }): Promise<PrCycleTimeDashboard> => {
    return loadDashboardPayload(data.weeks)
  })

export type RefreshLocalDataResult =
  | { ok: true; summary: RefreshSummary }
  | { ok: false; message: string }

export const refreshLocalDataFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<RefreshLocalDataResult> => {
    try {
      const summary = await refreshLocalData()
      return { ok: true, summary }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Refresh failed'
      const message = raw.replace(/\s+/g, ' ').trim().slice(0, 280) || 'Refresh failed'
      return { ok: false, message }
    }
  },
)
