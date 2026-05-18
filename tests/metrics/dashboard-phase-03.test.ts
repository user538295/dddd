import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import { getDashboardDateRanges } from '~/config/env'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'
import { getPrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'

const databaseUrl = process.env.DATABASE_URL?.trim()

describe('dashboard phase 03 integration', () => {
  let db: ReturnType<typeof createDb>
  let mappingPath: string
  let repoRoot: string
  const now = new Date('2026-04-30T12:00:00.000Z')

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await rm(repoRoot, { recursive: true, force: true })
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    await db.delete(pullRequests)
    await db.delete(repositories)

    repoRoot = await mkdtemp(path.join(process.cwd(), '.tmp', 'phase03-'))
    process.env.DASHBOARD_REPO_ROOT = repoRoot
    mappingPath = path.join(repoRoot, 'team-mapping.json')
    const mapping: TeamMappingConfig = { teams: [{ name: 'TeamX', repoPatterns: ['svc'] }] }
    await writeFile(mappingPath, JSON.stringify(mapping), 'utf8')
    process.env.TEAM_MAPPING_PATH = mappingPath
  })

  async function makeRepo(reviewSyncedAt: Date | null = null) {
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
    if (reviewSyncedAt) {
      await db
        .update(repositories)
        .set({ lastReviewSyncedAt: reviewSyncedAt })
        .where(eq(repositories.id, r.id))
    }
    return r
  }

  async function insertMergedPr(
    repoId: string,
    overrides: {
      mergedAt: Date
      openedAt?: Date
      additions?: number | null
      deletions?: number | null
      changedFiles?: number | null
      number?: number
    },
  ) {
    const openedAt =
      overrides.openedAt ?? new Date(overrides.mergedAt.getTime() - 24 * 60 * 60 * 1000)
    await db.insert(pullRequests).values({
      repositoryId: repoId,
      githubNodeId: `node-${randomUUID()}`,
      number: overrides.number ?? 1,
      title: `PR ${overrides.number ?? 1}`,
      state: 'merged',
      openedAt,
      githubUpdatedAt: overrides.mergedAt,
      mergedAt: overrides.mergedAt,
      url: `https://github.com/gde-mit/svc/pull/${overrides.number ?? 1}`,
      missingJiraKey: false,
      additions: overrides.additions ?? null,
      deletions: overrides.deletions ?? null,
      changedFiles: overrides.changedFiles ?? null,
    })
  }

  function currentMergedAt(dayOffsetFromStart: number): Date {
    const { current } = getDashboardDateRanges(now, 8)
    return new Date(current.from.getTime() + dayOffsetFromStart * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
  }

  it('dashboard_includes_pr_size_when_sized_prs_exist', async () => {
    const repo = await makeRepo()
    await insertMergedPr(repo.id, {
      mergedAt: currentMergedAt(3),
      additions: 100,
      deletions: 50,
      changedFiles: 4,
    })
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.prSize).toBeDefined()
    expect(out.prSize?.metric.qualifyingPrCount).toBe(1)
    expect(out.prSize?.metric.medianLines).toBe(150)
  })

  it('dashboard_omits_pr_size_when_no_sized_prs', async () => {
    const repo = await makeRepo()
    await insertMergedPr(repo.id, {
      mergedAt: currentMergedAt(3),
      additions: null,
      deletions: null,
    })
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.prSize).toBeUndefined()
  })

  it('dashboard_pr_size_metric_matches_expected_median', async () => {
    const repo = await makeRepo()
    const mergedAt = currentMergedAt(5)
    await insertMergedPr(repo.id, {
      mergedAt,
      number: 1,
      additions: 40,
      deletions: 10,
      changedFiles: 2,
    })
    await insertMergedPr(repo.id, {
      mergedAt,
      number: 2,
      additions: 100,
      deletions: 0,
      changedFiles: 5,
    })
    await insertMergedPr(repo.id, {
      mergedAt,
      number: 3,
      additions: 60,
      deletions: 40,
      changedFiles: 3,
    })
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.prSize?.metric.medianLines).toBe(100)
    expect(out.prSize?.metric.medianChangedFiles).toBe(3)
  })

  it('dashboard_computes_median_over_sized_prs_only', async () => {
    const repo = await makeRepo()
    const mergedAt = currentMergedAt(4)
    for (const [n, lines] of [
      [1, 100],
      [2, 200],
      [3, 300],
    ] as const) {
      await insertMergedPr(repo.id, {
        mergedAt,
        number: n,
        additions: lines,
        deletions: 0,
        changedFiles: 1,
      })
    }
    for (const n of [4, 5]) {
      await insertMergedPr(repo.id, {
        mergedAt,
        number: n,
        additions: null,
        deletions: null,
      })
    }
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.prSize).toBeDefined()
    expect(out.prSize?.metric.medianLines).toBe(200)
    expect(out.prSize?.metric.qualifyingPrCount).toBe(3)
  })

  it('dashboard_phase01_shape_unchanged', async () => {
    const repo = await makeRepo()
    const mergedAt = currentMergedAt(10)
    const openedAt = new Date(mergedAt.getTime() - 48 * 60 * 60 * 1000)
    for (const [n, cycleHours] of [
      [1, 24],
      [2, 48],
      [3, 72],
    ] as const) {
      await insertMergedPr(repo.id, {
        mergedAt,
        openedAt: new Date(mergedAt.getTime() - cycleHours * 60 * 60 * 1000),
        number: n,
        additions: 10,
        deletions: 0,
      })
    }
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.metric.medianHours).toBe(48)
    expect(out.metric.mergedPrCount).toBe(3)
    expect(Array.isArray(out.exceptions)).toBe(true)
    expect(out.weeklyTrend.length).toBeGreaterThan(0)
    expect(out.teamBreakdown.length).toBeGreaterThan(0)
  })

  it('dashboard_phase02_shape_unchanged', async () => {
    const syncedAt = new Date('2026-04-28T00:00:00Z')
    await makeRepo(syncedAt)
    const out = await getPrCycleTimeDashboard({ db, now })
    expect(out.firstReview).toBeDefined()
    expect(out.reviewFreshness).toBeDefined()
    expect(out.reviewMetricsPending).toBeUndefined()
    expect(out.firstReview?.metric).toMatchObject({
      qualifyingPrCount: expect.any(Number),
      mergedPrCountInSyncedRepos: expect.any(Number),
    })
  })
})
