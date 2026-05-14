import { eq, max } from 'drizzle-orm'

import { GitHubClient } from '~/collector/github-client'
import { upsertPullRequests } from '~/collector/pull-request-store'
import { ConfigError } from '~/config/env'
import { loadTeamMapping, resolveTeamForRepo, type TeamMappingConfig } from '~/config/team-mapping'
import { createDb, type AppDb } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

/**
 * Virtual `root_path` for repositories inserted only via GitHub import. The
 * normal collector refresh only syncs PRs for rows whose `root_path` matches
 * `DASHBOARD_REPO_ROOT`, so these rows stay independent.
 */
export const GITHUB_IMPORT_ROOT_PATH = '__github_import__'

export function importRepoStoragePath(owner: string, repo: string): string {
  return `${GITHUB_IMPORT_ROOT_PATH}/${owner}/${repo}`
}

export function parseRepoSlug(raw: string): { owner: string; repo: string } {
  const s = raw.trim()
  if (s === '') {
    throw new ConfigError('Repository slug must not be empty')
  }
  const slash = s.indexOf('/')
  if (slash <= 0 || slash === s.length - 1) {
    throw new ConfigError(`Invalid repository slug "${raw.trim()}": expected owner/repo`)
  }
  const owner = s.slice(0, slash).trim()
  const repo = s.slice(slash + 1).trim()
  if (owner === '' || repo === '') {
    throw new ConfigError(`Invalid repository slug "${raw.trim()}": expected owner/repo`)
  }
  if (owner.includes('/') || repo.includes('/')) {
    throw new ConfigError(`Invalid repository slug "${raw.trim()}": expected owner/repo`)
  }
  return { owner, repo }
}

export type GitHubImportSpec = { owner: string; repo: string }

export type GitHubImportInput = {
  databaseUrl: string
  githubToken?: string
  githubApiBaseUrl: string
  initialSyncFrom: Date
  githubSyncConcurrency: number
  teamMappingPath: string
  specs: GitHubImportSpec[]
}

export type GitHubImportSummary = {
  reposTouched: number
  prsSeen: number
  prsMerged: number
  prsOpen: number
  errors: { owner: string; repo: string; message: string }[]
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

async function upsertImportedRepository(
  db: AppDb,
  mapping: TeamMappingConfig,
  spec: GitHubImportSpec,
): Promise<string> {
  const { owner, repo } = spec
  const storagePath = importRepoStoragePath(owner, repo)
  const scanTime = new Date()
  const remoteUrl = `https://github.com/${owner}/${repo}`
  const team = resolveTeamForRepo(repo, mapping)

  const row = {
    name: repo,
    path: storagePath,
    rootPath: GITHUB_IMPORT_ROOT_PATH,
    remoteUrl,
    owner,
    repo,
    remoteIdentity: `${owner}/${repo}`,
    team,
    scanStatus: 'ready' as const,
    active: true,
    lastScannedAt: scanTime,
    updatedAt: scanTime,
  }

  const [existing] = await db.select({ id: repositories.id }).from(repositories).where(eq(repositories.path, storagePath)).limit(1)

  if (existing) {
    await db.update(repositories).set(row).where(eq(repositories.id, existing.id))
    return existing.id
  }

  const inserted = await db
    .insert(repositories)
    .values({
      ...row,
      lastPrSyncedAt: null,
    })
    .returning({ id: repositories.id })

  return inserted[0]!.id
}

export async function importGitHubRepositories(input: GitHubImportInput): Promise<GitHubImportSummary> {
  const summary: GitHubImportSummary = {
    reposTouched: 0,
    prsSeen: 0,
    prsMerged: 0,
    prsOpen: 0,
    errors: [],
  }

  if (input.specs.length === 0) {
    return summary
  }

  const db = createDb(input.databaseUrl)
  const mapping = await loadTeamMapping(input.teamMappingPath)
  const client = new GitHubClient({
    token: input.githubToken,
    baseUrl: input.githubApiBaseUrl,
  })

  try {
    const repoIds: { spec: GitHubImportSpec; repositoryId: string }[] = []
    for (const spec of input.specs) {
      const repositoryId = await upsertImportedRepository(db, mapping, spec)
      repoIds.push({ spec, repositoryId })
      summary.reposTouched += 1
    }

    await runWithConcurrency(repoIds, input.githubSyncConcurrency, async ({ spec, repositoryId }) => {
      try {
        const [repoRow] = await db.select({ lastPrSyncedAt: repositories.lastPrSyncedAt }).from(repositories).where(eq(repositories.id, repositoryId)).limit(1)

        const prs = await client.listPullRequests({
          owner: spec.owner,
          repo: spec.repo,
          state: 'all',
          ...(repoRow?.lastPrSyncedAt === null || repoRow?.lastPrSyncedAt === undefined
            ? { initialSyncFrom: input.initialSyncFrom }
            : { stopAfterUpdatedAt: repoRow.lastPrSyncedAt }),
        })

        const prSummary = await upsertPullRequests(db, repositoryId, prs)
        summary.prsSeen += prSummary.seen
        summary.prsMerged += prSummary.merged
        summary.prsOpen += prSummary.open

        const [maxRow] = await db
          .select({ m: max(pullRequests.githubUpdatedAt) })
          .from(pullRequests)
          .where(eq(pullRequests.repositoryId, repositoryId))

        const maxUpdated = maxRow?.m ?? null
        if (maxUpdated !== null) {
          await db
            .update(repositories)
            .set({ lastPrSyncedAt: maxUpdated, updatedAt: new Date() })
            .where(eq(repositories.id, repositoryId))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        summary.errors.push({ owner: spec.owner, repo: spec.repo, message })
      }
    })

    return summary
  } finally {
    await db.$client.end({ timeout: 5 })
  }
}
