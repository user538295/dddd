import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories, syncErrors, syncRuns } from '~/db/schema'
import { getMergedPrsSource, getReposSource, getSyncErrorsSource } from '~/metrics/dashboard-sources'

const databaseUrl = process.env.DATABASE_URL?.trim()

async function writeTeamMapping(dir: string, content: unknown): Promise<string> {
  const p = path.join(dir, 'team-mapping.json')
  await writeFile(p, JSON.stringify(content), 'utf8')
  return p
}

describe('dashboard-sources', () => {
  let db: ReturnType<typeof createDb>
  let testRoot: string
  let mappingPath: string
  let mappingDir: string

  beforeAll(async () => {
    await mkdir(path.join(process.cwd(), '.tmp'), { recursive: true })
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl!)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    testRoot = path.join('/tmp', `dash-src-${randomUUID()}`)
    mappingDir = path.join('/tmp', `dash-src-map-${randomUUID()}`)
    await mkdir(mappingDir, { recursive: true })
    mappingPath = await writeTeamMapping(mappingDir, {
      teams: [{ name: 'Alpha', repoPatterns: ['alpha-*'] }],
      includeRepoPatterns: ['*'],
    })
    vi.stubEnv('DASHBOARD_REPO_ROOT', testRoot)
    vi.stubEnv('TEAM_MAPPING_PATH', mappingPath)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    // Clean shared sync tables and this file's repos so tests are order-independent.
    await db.delete(syncErrors)
    await db.delete(syncRuns)
    const repoRows = await db.select({ id: repositories.id }).from(repositories).where(eq(repositories.rootPath, testRoot))
    const ids = repoRows.map((r) => r.id)
    if (ids.length > 0) {
      await db.delete(pullRequests).where(inArray(pullRequests.repositoryId, ids))
      await db.delete(repositories).where(inArray(repositories.id, ids))
    }
    await rm(mappingDir, { recursive: true, force: true })
  })

  it('merged_prs_source_lists_current_range_merged_prs', async () => {
    const repoId = randomUUID()
    await db.insert(repositories).values({
      id: repoId,
      name: 'alpha-svc',
      path: path.join(testRoot, 'alpha-svc'),
      rootPath: testRoot,
      scanStatus: 'ready',
      active: true,
      team: 'Alpha',
      owner: 'gde-mit',
      repo: 'alpha-svc',
      remoteUrl: 'https://github.com/gde-mit/alpha-svc.git',
    })

    const now = new Date('2026-05-14T12:00:00.000Z')
    await db.insert(pullRequests).values({
      repositoryId: repoId,
      githubNodeId: 'node-1',
      number: 1,
      title: 'Feature A',
      state: 'merged',
      openedAt: new Date('2026-05-01T10:00:00.000Z'),
      githubUpdatedAt: new Date('2026-05-10T10:00:00.000Z'),
      mergedAt: new Date('2026-05-10T12:00:00.000Z'),
      url: 'https://github.com/gde-mit/alpha-svc/pull/1',
      missingJiraKey: false,
    })

    const result = await getMergedPrsSource({ db, weeks: 8, now })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.title).toBe('Feature A')
    expect(result.rows[0]?.url).toContain('/pull/1')
  })

  it('repos_source_lists_scanned_repositories', async () => {
    await db.insert(repositories).values({
      id: randomUUID(),
      name: 'alpha-svc',
      path: path.join(testRoot, 'alpha-svc'),
      rootPath: testRoot,
      scanStatus: 'ready',
      active: true,
      team: 'Alpha',
    })

    const result = await getReposSource({ db })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.includedInMetrics).toBe(true)
  })

  it('sync_errors_source_lists_latest_run_errors', async () => {
    const runId = randomUUID()
    await db.insert(syncRuns).values({
      id: runId,
      kind: 'collector_refresh',
      status: 'partial',
      startedAt: new Date('2026-05-14T10:00:00.000Z'),
      finishedAt: new Date('2026-05-14T10:05:00.000Z'),
      errorCount: 1,
    })
    await db.insert(syncErrors).values({
      syncRunId: runId,
      repositoryId: null,
      source: 'github_api',
      message: 'rate limit exceeded',
    })

    const result = await getSyncErrorsSource({ db })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.message).toBe('rate limit exceeded')
  })
})
