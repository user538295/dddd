import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { and, eq, max } from 'drizzle-orm'

import { GitHubClient } from '~/collector/github-client'
import { discoverRepositories } from '~/collector/repo-discovery'
import { upsertPullRequests } from '~/collector/pull-request-store'
import { upsertRepositories } from '~/collector/repository-store'
import type { AppEnv } from '~/config/env'
import { getEnv } from '~/config/env'
import { loadTeamMapping } from '~/config/team-mapping'
import { createDb } from '~/db/client'
import { pullRequests, repositories, syncErrors, syncRuns } from '~/db/schema'

export type RefreshSummary = {
  reposScanned: number
  reposIncluded: number
  reposExcluded: number
  prsSeen: number
  prsMerged: number
  prsMissingJiraKey: number
  syncErrors: number
  syncWarnings: number
  status: 'success' | 'partial' | 'failed'
}

function buildProcessEnvFromPartial(partial?: Partial<AppEnv>): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env }
  if (!partial) {
    return e
  }
  if (partial.repoRoot !== undefined) e.DASHBOARD_REPO_ROOT = partial.repoRoot
  if (partial.databaseUrl !== undefined) e.DATABASE_URL = partial.databaseUrl
  if (partial.teamMappingPath !== undefined) e.TEAM_MAPPING_PATH = partial.teamMappingPath
  if (partial.githubToken !== undefined) {
    e.GITHUB_TOKEN = partial.githubToken
  }
  if (partial.githubApiBaseUrl !== undefined) e.GITHUB_API_BASE_URL = partial.githubApiBaseUrl
  if (partial.defaultRangeWeeks !== undefined) {
    e.DASHBOARD_DEFAULT_RANGE_WEEKS = String(partial.defaultRangeWeeks)
  }
  if (partial.initialSyncFrom !== undefined) {
    e.DASHBOARD_INITIAL_SYNC_FROM = partial.initialSyncFrom.toISOString()
  }
  if (partial.githubSyncConcurrency !== undefined) {
    e.GITHUB_SYNC_CONCURRENCY = String(partial.githubSyncConcurrency)
  }
  if (partial.githubSyncOwner !== undefined) e.GITHUB_SYNC_OWNER = partial.githubSyncOwner
  return e
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return
  const n = Math.max(1, Math.min(limit, items.length))
  let next = 0
  async function runWorker(): Promise<void> {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) return
      await worker(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: n }, () => runWorker()))
}

/**
 * Scans local repositories, upserts metadata, syncs GitHub PRs for `ready`
 * repositories, and records sync run / error rows.
 */
export async function refreshLocalData(input?: Partial<AppEnv>): Promise<RefreshSummary> {
  const mergedEnv = buildProcessEnvFromPartial(input)
  const env = getEnv(mergedEnv)
  const db = createDb(env.databaseUrl)

  if (mergedEnv.DASHBOARD_E2E_REFRESH_STUB?.trim() === '1') {
    try {
      const startedAt = new Date()
      const newRunId = randomUUID()
      await db.insert(syncRuns).values({
        id: newRunId,
        kind: 'collector_refresh',
        status: 'success',
        startedAt,
        finishedAt: new Date(),
        message: 'e2e_stub',
        errorCount: 0,
      })
      return {
        reposScanned: 0,
        reposIncluded: 0,
        reposExcluded: 0,
        prsSeen: 0,
        prsMerged: 0,
        prsMissingJiraKey: 0,
        syncErrors: 0,
        syncWarnings: 0,
        status: 'success',
      }
    } finally {
      await db.$client.end({ timeout: 5 })
    }
  }

  const summary: RefreshSummary = {
    reposScanned: 0,
    reposIncluded: 0,
    reposExcluded: 0,
    prsSeen: 0,
    prsMerged: 0,
    prsMissingJiraKey: 0,
    syncErrors: 0,
    syncWarnings: 0,
    status: 'failed',
  }

  let syncRunId: string | null = null

  const insertError = async (repositoryId: string | null, source: string, message: string) => {
    if (syncRunId === null) return
    await db.insert(syncErrors).values({
      syncRunId,
      repositoryId,
      source,
      message,
    })
  }

  try {
    const mapping = await loadTeamMapping(env.teamMappingPath)
    const repoRoot = path.resolve(env.repoRoot)
    const candidates = await discoverRepositories(repoRoot)

    const startedAt = new Date()
    const newRunId = randomUUID()
    await db.insert(syncRuns).values({
      id: newRunId,
      kind: 'collector_refresh',
      status: 'running',
      startedAt,
      finishedAt: null,
      message: null,
      errorCount: 0,
    })
    syncRunId = newRunId

    const repoSync = await upsertRepositories(db, repoRoot, candidates, mapping, env.githubSyncOwner)

    summary.reposScanned = repoSync.scanned
    summary.reposIncluded = repoSync.ready
    summary.reposExcluded = repoSync.excluded + repoSync.metadataIncomplete + repoSync.missing
    summary.syncWarnings = repoSync.remoteIdentityChanges

    const readyRows = await db
      .select()
      .from(repositories)
      .where(
        and(
          eq(repositories.scanStatus, 'ready'),
          eq(repositories.active, true),
          eq(repositories.rootPath, repoRoot),
        ),
      )

    const syncTargets = readyRows.filter((r) => r.owner && r.repo)

    const client = new GitHubClient({
      token: env.githubToken,
      baseUrl: env.githubApiBaseUrl,
    })

    let prSyncSuccesses = 0
    let prSyncAttempts = 0

    await runWithConcurrency(syncTargets, env.githubSyncConcurrency, async (repo) => {
      prSyncAttempts += 1
      try {
        const last = repo.lastPrSyncedAt
        const prs = await client.listPullRequests({
          owner: repo.owner!,
          repo: repo.repo!,
          state: 'all',
          ...(last === null ? { initialSyncFrom: env.initialSyncFrom } : { stopAfterUpdatedAt: last }),
        })

        const prSummary = await upsertPullRequests(db, repo.id, prs)
        summary.prsSeen += prSummary.seen
        summary.prsMerged += prSummary.merged
        summary.prsMissingJiraKey += prSummary.missingJiraKey

        for (const num of prSummary.invalidLifecyclePullNumbers) {
          await insertError(
            repo.id,
            'invalid_pr_lifecycle',
            `Pull request #${num} has mergedAt before openedAt`,
          )
        }

        const [maxRow] = await db
          .select({ m: max(pullRequests.githubUpdatedAt) })
          .from(pullRequests)
          .where(eq(pullRequests.repositoryId, repo.id))

        const maxUpdated = maxRow?.m ?? null
        if (maxUpdated !== null) {
          await db
            .update(repositories)
            .set({ lastPrSyncedAt: maxUpdated, updatedAt: new Date() })
            .where(eq(repositories.id, repo.id))
        }

        prSyncSuccesses += 1
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await insertError(repo.id, 'github_sync', msg)
      }
    })

    const errorRows = await db.select({ id: syncErrors.id }).from(syncErrors).where(eq(syncErrors.syncRunId, syncRunId))
    const errorRowCount = errorRows.length
    summary.syncErrors = errorRowCount

    let runStatus: 'success' | 'partial' | 'failed' = 'success'
    if (prSyncAttempts > 0 && prSyncSuccesses === 0 && errorRowCount > 0) {
      runStatus = 'failed'
    } else if (errorRowCount > 0 && prSyncSuccesses > 0) {
      runStatus = 'partial'
    } else if (errorRowCount > 0) {
      runStatus = 'failed'
    } else {
      runStatus = 'success'
    }

    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        errorCount: errorRowCount,
        status: runStatus,
        message: null,
      })
      .where(eq(syncRuns.id, syncRunId))

    summary.status = runStatus
    return summary
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (syncRunId !== null) {
      await insertError(null, 'refresh_orchestration', msg)
      const errorRows = await db.select({ id: syncErrors.id }).from(syncErrors).where(eq(syncErrors.syncRunId, syncRunId))
      summary.syncErrors = errorRows.length
      await db
        .update(syncRuns)
        .set({
          finishedAt: new Date(),
          errorCount: errorRows.length,
          status: 'failed',
          message: msg,
        })
        .where(eq(syncRuns.id, syncRunId))
    }
    summary.status = 'failed'
    return summary
  } finally {
    await db.$client.end({ timeout: 5 })
  }
}
