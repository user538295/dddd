import type { pullRequests } from '~/db/schema'

export type PullRequestRecord = typeof pullRequests.$inferSelect

export type PrCycleTimeResult = {
  pullRequestId: string
  cycleTimeHours: number
}

const MS_PER_HOUR = 1000 * 60 * 60

export function calculatePrCycleTime(pr: PullRequestRecord): PrCycleTimeResult | null {
  if (pr.mergedAt == null) {
    return null
  }
  const openedMs = pr.openedAt.getTime()
  const mergedMs = pr.mergedAt.getTime()
  if (mergedMs < openedMs) {
    return null
  }
  return {
    pullRequestId: pr.id,
    cycleTimeHours: (mergedMs - openedMs) / MS_PER_HOUR,
  }
}
