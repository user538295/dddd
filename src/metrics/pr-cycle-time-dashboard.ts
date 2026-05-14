import { desc, eq, inArray, isNotNull } from 'drizzle-orm'

import { getDashboardDateRanges, getEnv } from '~/config/env'
import { loadTeamMapping } from '~/config/team-mapping'
import type { AppDb } from '~/db/client'
import { pullRequests, repositories, syncRuns } from '~/db/schema'
import { calculatePrCycleTime, type PullRequestRecord } from '~/metrics/pr-cycle-time'
import { comparePeriods, getWeeklyMedianTrend, median } from '~/metrics/pr-cycle-time-summary'

export type PrCycleTimeDashboardInput = {
  db: AppDb
  weeks?: number
  now?: Date
}

export type PrCycleTimeException = {
  type: 'team_worsened' | 'long_open_prs' | 'baseline_pending'
  severity: 'warning' | 'info'
  team: string
  message: string
}

export type PrCycleTimeDashboard = {
  range: { from: string; to: string; weeks: number }
  metric: {
    medianHours: number | null
    mergedPrCount: number
    trendPercent: number | null
    baselineStatus: 'available' | 'pending'
  }
  exceptions: PrCycleTimeException[]
  weeklyTrend: Array<{ weekStart: string; medianHours: number | null }>
  teamBreakdown: Array<{
    team: string
    mergedPrs: number
    medianHours: number | null
    trendPercent: number | null
    longestOpenPrHours: number | null
  }>
  freshness: {
    reposScanned: number
    prMetadataSyncedAt: string | null
    prsMissingJiraKey: number
    syncErrors: number
    latestSyncStatus: 'success' | 'partial' | 'failed' | 'never_run'
  }
}

const MS_PER_HOUR = 1000 * 60 * 60

export const DASHBOARD_UNASSIGNED_TEAM = 'Unassigned'

function isMetricsRepository(repo: typeof repositories.$inferSelect): boolean {
  return repo.active && repo.scanStatus === 'ready'
}

function repoTeamLabel(repo: typeof repositories.$inferSelect): string {
  return repo.team?.trim() ? repo.team : DASHBOARD_UNASSIGNED_TEAM
}

function rowToPr(row: typeof pullRequests.$inferSelect): PullRequestRecord {
  return {
    ...row,
    state: row.state as PullRequestRecord['state'],
  }
}

function mergedInCurrent(pr: PullRequestRecord, from: Date, to: Date): boolean {
  if (pr.mergedAt == null) return false
  const m = pr.mergedAt.getTime()
  return m >= from.getTime() && m <= to.getTime()
}

function mergedInPrevious(pr: PullRequestRecord, previousFrom: Date, currentFrom: Date): boolean {
  if (pr.mergedAt == null) return false
  const m = pr.mergedAt.getTime()
  return m >= previousFrom.getTime() && m < currentFrom.getTime()
}

function cycleHoursForMerged(pr: PullRequestRecord): number | null {
  const c = calculatePrCycleTime(pr)
  return c?.cycleTimeHours ?? null
}

function formatIso(d: Date): string {
  return d.toISOString()
}

type TeamBreakdownRow = PrCycleTimeDashboard['teamBreakdown'][number]

function sortExceptions(exceptions: PrCycleTimeException[], teamBreakdown: TeamBreakdownRow[]): void {
  const absTrendFor = (e: PrCycleTimeException): number | null => {
    if (e.type !== 'team_worsened') return null
    const tr = teamBreakdown.find((t) => t.team === e.team)?.trendPercent
    return tr == null ? null : Math.abs(tr)
  }

  exceptions.sort((a, b) => {
    const sev = (s: PrCycleTimeException['severity']) => (s === 'warning' ? 1 : 0)
    const ds = sev(b.severity) - sev(a.severity)
    if (ds !== 0) return ds

    const ta = absTrendFor(a)
    const tb = absTrendFor(b)
    if (ta == null && tb == null) return a.team.localeCompare(b.team)
    if (ta == null) return 1
    if (tb == null) return -1
    if (tb !== ta) return tb - ta
    return a.team.localeCompare(b.team)
  })
}

export async function getPrCycleTimeDashboard(input: PrCycleTimeDashboardInput): Promise<PrCycleTimeDashboard> {
  const env = getEnv()
  const now = input.now ?? new Date()
  const weeks = input.weeks ?? env.defaultRangeWeeks
  const { current, previous } = getDashboardDateRanges(now, weeks)
  await loadTeamMapping(env.teamMappingPath)

  const allRepos = await input.db
    .select()
    .from(repositories)
    .where(eq(repositories.rootPath, env.repoRoot))

  const reposScanned = allRepos.filter((r) => r.scanStatus !== 'missing').length
  const metricsRepos = allRepos.filter(isMetricsRepository)
  const metricsRepoIds = metricsRepos.map((r) => r.id)

  const prRows =
    metricsRepoIds.length === 0
      ? []
      : await input.db.select().from(pullRequests).where(inArray(pullRequests.repositoryId, metricsRepoIds))

  const prs = prRows.map(rowToPr)

  const currentMerged = prs.filter((p) => mergedInCurrent(p, current.from, current.to))
  const previousMerged = prs.filter((p) => mergedInPrevious(p, previous.from, current.from))

  const currentHours = currentMerged.map(cycleHoursForMerged).filter((h): h is number => h != null)
  const previousHours = previousMerged.map(cycleHoursForMerged).filter((h): h is number => h != null)

  const currentMedian = median(currentHours)
  const previousMedian = median(previousHours)
  const mergedPrCount = currentMerged.length

  const trend = comparePeriods({
    currentMedian,
    previousMedian,
    previousMergedPrCount: previousMerged.length,
  })

  const weeklyTrend = getWeeklyMedianTrend(
    prs.filter((p) => mergedInCurrent(p, current.from, current.to)),
    current,
  )

  const teamLabels = new Set<string>()
  for (const r of metricsRepos) {
    teamLabels.add(repoTeamLabel(r))
  }
  const sortedTeamLabels = [...teamLabels].sort((a, b) => a.localeCompare(b))

  const teamBreakdown: TeamBreakdownRow[] = sortedTeamLabels.map((teamLabel) => {
    const repoIdsForTeam = new Set(
      metricsRepos.filter((r) => repoTeamLabel(r) === teamLabel).map((r) => r.id),
    )

    const curTeam = currentMerged.filter((p) => repoIdsForTeam.has(p.repositoryId))
    const prevTeam = previousMerged.filter((p) => repoIdsForTeam.has(p.repositoryId))
    const curH = curTeam.map(cycleHoursForMerged).filter((h): h is number => h != null)
    const prevMed = median(prevTeam.map(cycleHoursForMerged).filter((h): h is number => h != null))
    const med = median(curH)
    const teamTrend = comparePeriods({
      currentMedian: med,
      previousMedian: prevMed,
      previousMergedPrCount: prevTeam.length,
    })

    const openForTeam = prs.filter((p) => p.state === 'open' && repoIdsForTeam.has(p.repositoryId))
    let longestOpenPrHours: number | null = null
    if (openForTeam.length > 0) {
      const ages = openForTeam.map((p) => (now.getTime() - p.openedAt.getTime()) / MS_PER_HOUR)
      longestOpenPrHours = Math.max(...ages)
    }

    return {
      team: teamLabel,
      mergedPrs: curTeam.length,
      medianHours: med,
      trendPercent: teamTrend.trendPercent,
      longestOpenPrHours,
    }
  })

  const [latestRun] = await input.db
    .select()
    .from(syncRuns)
    .where(isNotNull(syncRuns.finishedAt))
    .orderBy(desc(syncRuns.finishedAt), desc(syncRuns.id))
    .limit(1)

  let latestSyncStatus: PrCycleTimeDashboard['freshness']['latestSyncStatus'] = 'never_run'
  if (latestRun && (latestRun.status === 'success' || latestRun.status === 'partial' || latestRun.status === 'failed')) {
    latestSyncStatus = latestRun.status
  }

  const prsMissingJiraKey = prs.filter(
    (p) => p.missingJiraKey && (p.state === 'open' || mergedInCurrent(p, current.from, current.to)),
  ).length

  const exceptions: PrCycleTimeException[] = []

  for (const row of teamBreakdown) {
    const prevTeam = previousMerged.filter((p) => {
      const r = metricsRepos.find((x) => x.id === p.repositoryId)
      return r && repoTeamLabel(r) === row.team
    })

    if (row.mergedPrs > 0 && prevTeam.length < 3) {
      exceptions.push({
        type: 'baseline_pending',
        severity: 'info',
        team: row.team,
        message: `${row.team} has fewer than 3 merged pull requests in the previous period; baseline comparison is pending.`,
      })
    }

    const prevTeamMedian = median(
      prevTeam.map(cycleHoursForMerged).filter((h): h is number => h != null),
    )

    const teamBaselineAvailable =
      prevTeam.length >= 3 && prevTeamMedian != null && prevTeamMedian > 0

    if (
      teamBaselineAvailable &&
      row.medianHours != null &&
      prevTeamMedian != null &&
      row.medianHours >= prevTeamMedian * 1.25
    ) {
      exceptions.push({
        type: 'team_worsened',
        severity: 'warning',
        team: row.team,
        message: `${row.team} median PR cycle time worsened by at least 25% versus the previous period.`,
      })
    }

    if (row.medianHours != null) {
      const teamMedian = row.medianHours
      const tooOld = prs.some((p) => {
        if (p.state !== 'open') return false
        const r = metricsRepos.find((x) => x.id === p.repositoryId)
        if (!r || repoTeamLabel(r) !== row.team) return false
        const ageH = (now.getTime() - p.openedAt.getTime()) / MS_PER_HOUR
        return ageH > teamMedian
      })
      if (tooOld) {
        exceptions.push({
          type: 'long_open_prs',
          severity: 'warning',
          team: row.team,
          message: `${row.team} has open pull requests older than the team's current median cycle time.`,
        })
      }
    }
  }

  sortExceptions(exceptions, teamBreakdown)
  const limited = exceptions.slice(0, 3)

  return {
    range: {
      from: formatIso(current.from),
      to: formatIso(current.to),
      weeks: current.weeks,
    },
    metric: {
      medianHours: currentMedian,
      mergedPrCount,
      trendPercent: trend.trendPercent,
      baselineStatus: trend.baselineStatus,
    },
    exceptions: limited,
    weeklyTrend,
    teamBreakdown,
    freshness: {
      reposScanned,
      prMetadataSyncedAt: latestRun?.finishedAt ? formatIso(latestRun.finishedAt) : null,
      prsMissingJiraKey,
      syncErrors: latestRun?.errorCount ?? 0,
      latestSyncStatus,
    },
  }
}
