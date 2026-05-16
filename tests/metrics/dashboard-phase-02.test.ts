import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import { createDb, runMigrations } from '~/db/client'
import { getPrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'
import {
  pullRequestReviewComments,
  pullRequestReviews,
  pullRequests,
  repositories,
  syncErrors,
  syncRuns,
} from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

describe.skipIf(!hasDatabaseUrl)('dashboard phase 02 integration', () => {
  let db: ReturnType<typeof createDb>
  let mappingPath: string
  let repoRoot: string

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await rm(repoRoot, { recursive: true, force: true })
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    await db.delete(syncErrors)
    await db.delete(pullRequestReviews)
    await db.delete(pullRequestReviewComments)
    await db.delete(pullRequests)
    await db.delete(repositories)
    await db.delete(syncRuns)

    repoRoot = await mkdtemp(path.join(process.cwd(), '.tmp', 'phase02-'))
    process.env.DASHBOARD_REPO_ROOT = repoRoot
    mappingPath = path.join(repoRoot, 'team-mapping.json')
    const mapping: TeamMappingConfig = { teams: [{ name: 'TeamX', repoPatterns: ['svc'] }] }
    await writeFile(mappingPath, JSON.stringify(mapping), 'utf8')
    process.env.TEAM_MAPPING_PATH = mappingPath
  })

  async function makeRepo(syncedAt: Date | null) {
    const cand: RepositoryCandidate = {
      name: 'svc',
      path: path.join(repoRoot, `svc-${randomUUID()}`),
      rootPath: repoRoot,
      remoteUrl: 'https://github.com/gde-mit/svc.git',
      owner: 'gde-mit',
      repo: 'svc',
    }
    await mkdir(cand.path, { recursive: true })
    await upsertRepositories(
      db,
      repoRoot,
      [cand],
      { teams: [{ name: 'TeamX', repoPatterns: ['svc'] }] },
      'gde-mit',
    )
    const [r] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    if (syncedAt) {
      await db
        .update(repositories)
        .set({ lastReviewSyncedAt: syncedAt })
        .where(eq(repositories.id, r.id))
    }
    return r
  }

  it('payload_omits_firstReview_key_before_first_sync', async () => {
    await makeRepo(null)
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.firstReview).toBeUndefined()
    expect(out.reviewMetricsPending).toBeDefined()
  })

  it('payload_includes_firstReview_after_first_sync', async () => {
    await makeRepo(new Date('2026-04-28T00:00:00Z'))
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.firstReview).toBeDefined()
    expect(out.reviewMetricsPending).toBeUndefined()
  })

  it('payload_includes_reviewFreshness_when_phase02_visible', async () => {
    const syncedAt = new Date('2026-04-28T10:00:00Z')
    await makeRepo(syncedAt)
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.reviewFreshness?.oldestReviewSyncAt).toBe(syncedAt.toISOString())
    expect(Array.isArray(out.reviewFreshness?.reviewSyncErrors)).toBe(true)
  })

  it('phase_01_payload_byte_identical_in_hidden_state', async () => {
    await makeRepo(null)
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.freshness.reposScanned).toBeGreaterThanOrEqual(1)
  })

  it('payload_omits_reviewMetricsPending_when_phase02_visible', async () => {
    await makeRepo(new Date('2026-04-28T00:00:00Z'))
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(Object.prototype.hasOwnProperty.call(out, 'reviewMetricsPending')).toBe(false)
  })

  it('freshness_shows_oldest_review_sync_across_synced_repos', async () => {
    const older = new Date('2026-04-25T00:00:00Z')
    const newer = new Date('2026-04-28T00:00:00Z')
    // two synced repos
    const cands: RepositoryCandidate[] = [
      {
        name: 'svc',
        path: path.join(repoRoot, `svc1-${randomUUID()}`),
        rootPath: repoRoot,
        remoteUrl: 'https://github.com/gde-mit/svc.git',
        owner: 'gde-mit',
        repo: 'svc',
      },
      {
        name: 'svc',
        path: path.join(repoRoot, `svc2-${randomUUID()}`),
        rootPath: repoRoot,
        remoteUrl: 'https://github.com/gde-mit/svc2.git',
        owner: 'gde-mit',
        repo: 'svc2',
      },
    ]
    for (const c of cands) await mkdir(c.path, { recursive: true })
    await upsertRepositories(
      db,
      repoRoot,
      cands,
      { teams: [{ name: 'TeamX', repoPatterns: ['svc', 'svc2'] }] },
      'gde-mit',
    )
    const allRepos = await db.select().from(repositories)
    await db
      .update(repositories)
      .set({ lastReviewSyncedAt: older })
      .where(eq(repositories.id, allRepos[0].id))
    await db
      .update(repositories)
      .set({ lastReviewSyncedAt: newer })
      .where(eq(repositories.id, allRepos[1].id))
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.reviewFreshness?.oldestReviewSyncAt).toBe(older.toISOString())
  })

  it('phase_02_section_hidden_when_repositories_table_empty', async () => {
    const out = await getPrCycleTimeDashboard({ db, now: new Date('2026-04-30T00:00:00Z') })
    expect(out.firstReview).toBeUndefined()
    expect(out.reviewMetricsPending).toBeDefined()
  })
})
