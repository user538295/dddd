import { desc, eq, inArray, isNotNull } from 'drizzle-orm'

import { getDashboardDateRanges, getEnv } from '~/config/env'
import { loadTeamMapping } from '~/config/team-mapping'
import type { AppDb } from '~/db/client'
import { pullRequests, repositories, syncErrors, syncRuns } from '~/db/schema'
import { calculatePrCycleTime, type PullRequestRecord } from '~/metrics/pr-cycle-time'

export type DashboardSourcesInput = {
  db: AppDb
  weeks?: number
  now?: Date
}

export type MergedPrSourceRow = {
  title: string
  repositoryName: string
  team: string | null
  mergedAt: string
  cycleTimeHours: number | null
  url: string
}

export type RepoSourceRow = {
  name: string
  team: string | null
  scanStatus: string
  path: string
  remoteUrl: string | null
  includedInMetrics: boolean
}

export type SyncRunSource = {
  id: string
  status: string
  startedAt: string
  finishedAt: string | null
  message: string | null
  errorCount: number
}

export type SyncErrorSourceRow = {
  source: string
  message: string
  repositoryName: string | null
  createdAt: string
}

function isMetricsRepository(repo: typeof repositories.$inferSelect): boolean {
  return repo.active && repo.scanStatus === 'ready'
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

function formatIso(d: Date): string {
  return d.toISOString()
}

async function loadScope(input: DashboardSourcesInput) {
  const env = getEnv()
  const now = input.now ?? new Date()
  const weeks = input.weeks ?? env.defaultRangeWeeks
  const { current } = getDashboardDateRanges(now, weeks)
  await loadTeamMapping(env.teamMappingPath)

  const allRepos = await input.db
    .select()
    .from(repositories)
    .where(eq(repositories.rootPath, env.repoRoot))

  const metricsRepos = allRepos.filter(isMetricsRepository)
  const metricsRepoIds = metricsRepos.map((r) => r.id)
  const repoById = new Map(metricsRepos.map((r) => [r.id, r]))

  const prRows =
    metricsRepoIds.length === 0
      ? []
      : await input.db.select().from(pullRequests).where(inArray(pullRequests.repositoryId, metricsRepoIds))

  return {
    env,
    now,
    weeks,
    current,
    allRepos,
    metricsRepos,
    prs: prRows.map(rowToPr),
    repoById,
  }
}

export async function getMergedPrsSource(input: DashboardSourcesInput): Promise<{
  range: { from: string; to: string; weeks: number }
  rows: MergedPrSourceRow[]
}> {
  const { current, prs, repoById } = await loadScope(input)
  const currentMerged = prs
    .filter((p) => mergedInCurrent(p, current.from, current.to))
    .map((p) => {
      const repo = repoById.get(p.repositoryId)
      const cycle = calculatePrCycleTime(p)
      return {
        title: p.title,
        repositoryName: repo?.name ?? 'Unknown repository',
        team: repo?.team ?? null,
        mergedAt: formatIso(p.mergedAt!),
        cycleTimeHours: cycle?.cycleTimeHours ?? null,
        url: p.url,
      }
    })
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))

  return {
    range: { from: formatIso(current.from), to: formatIso(current.to), weeks: current.weeks },
    rows: currentMerged,
  }
}

export async function getReposSource(input: DashboardSourcesInput): Promise<{
  repoRoot: string
  rows: RepoSourceRow[]
}> {
  const { env, allRepos, metricsRepos } = await loadScope(input)
  const metricsIds = new Set(metricsRepos.map((r) => r.id))
  const rows = allRepos
    .filter((r) => r.scanStatus !== 'missing')
    .map((r) => ({
      name: r.name,
      team: r.team,
      scanStatus: r.scanStatus,
      path: r.path,
      remoteUrl: r.remoteUrl,
      includedInMetrics: metricsIds.has(r.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { repoRoot: env.repoRoot, rows }
}

export async function getLatestSyncSource(input: DashboardSourcesInput): Promise<SyncRunSource | null> {
  const [latestRun] = await input.db
    .select()
    .from(syncRuns)
    .where(isNotNull(syncRuns.finishedAt))
    .orderBy(desc(syncRuns.finishedAt), desc(syncRuns.id))
    .limit(1)

  if (!latestRun) return null

  return {
    id: latestRun.id,
    status: latestRun.status,
    startedAt: formatIso(latestRun.startedAt),
    finishedAt: latestRun.finishedAt ? formatIso(latestRun.finishedAt) : null,
    message: latestRun.message,
    errorCount: latestRun.errorCount,
  }
}

export async function getSyncErrorsSource(input: DashboardSourcesInput): Promise<{
  syncRun: SyncRunSource | null
  rows: SyncErrorSourceRow[]
}> {
  const syncRun = await getLatestSyncSource(input)
  if (!syncRun) {
    return { syncRun: null, rows: [] }
  }

  const errorRows = await input.db
    .select({
      source: syncErrors.source,
      message: syncErrors.message,
      createdAt: syncErrors.createdAt,
      repositoryName: repositories.name,
    })
    .from(syncErrors)
    .leftJoin(repositories, eq(syncErrors.repositoryId, repositories.id))
    .where(eq(syncErrors.syncRunId, syncRun.id))
    .orderBy(desc(syncErrors.createdAt))

  return {
    syncRun,
    rows: errorRows.map((r) => ({
      source: r.source,
      message: r.message,
      repositoryName: r.repositoryName,
      createdAt: formatIso(r.createdAt),
    })),
  }
}
