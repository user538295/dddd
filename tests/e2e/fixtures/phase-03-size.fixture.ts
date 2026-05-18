import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { AppDb } from '~/db/client'
import { pullRequestReviews, pullRequests, repositories, syncErrors, syncRuns } from '~/db/schema'

export type Phase03Scenario = 'with-exceptions' | 'no-exceptions' | 'no-size-data'

export async function resetPhase03(db: AppDb): Promise<void> {
  await db.delete(syncErrors)
  await db.delete(syncRuns)
  await db.delete(pullRequestReviews)
  await db.delete(pullRequests)
  await db.delete(repositories)
}

export async function seedPhase03(
  db: AppDb,
  options: { repoRoot: string; scenario: Phase03Scenario },
): Promise<void> {
  const { repoRoot, scenario } = options
  const now = new Date()
  const mergedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const openedAt = new Date(mergedAt.getTime() - 24 * 60 * 60 * 1000)

  const alphaId = randomUUID()
  const betaId = randomUUID()

  await db.insert(repositories).values([
    {
      id: alphaId,
      name: 'svc-alpha',
      path: path.join(repoRoot, `svc-alpha-${randomUUID()}`),
      rootPath: repoRoot,
      remoteUrl: 'https://github.com/gde-mit/svc-alpha.git',
      owner: 'gde-mit',
      repo: 'svc-alpha',
      remoteIdentity: 'github:gde-mit/svc-alpha',
      team: 'TeamAlpha',
      scanStatus: 'ready',
      active: true,
      lastScannedAt: now,
      lastPrSyncedAt: now,
      lastReviewSyncedAt: now,
    },
    {
      id: betaId,
      name: 'svc-beta',
      path: path.join(repoRoot, `svc-beta-${randomUUID()}`),
      rootPath: repoRoot,
      remoteUrl: 'https://github.com/gde-mit/svc-beta.git',
      owner: 'gde-mit',
      repo: 'svc-beta',
      remoteIdentity: 'github:gde-mit/svc-beta',
      team: 'TeamBeta',
      scanStatus: 'ready',
      active: true,
      lastScannedAt: now,
      lastPrSyncedAt: now,
    },
  ])

  await db.insert(syncRuns).values({
    id: randomUUID(),
    kind: 'collector_refresh',
    status: 'success',
    startedAt: now,
    finishedAt: now,
    message: 'phase03-e2e-seed',
    errorCount: 0,
  })

  if (scenario === 'no-size-data') {
    await db.insert(pullRequests).values([
      makePr(alphaId, 1, openedAt, mergedAt, null),
      makePr(alphaId, 2, openedAt, mergedAt, null),
      makePr(betaId, 3, openedAt, mergedAt, null),
    ])
    return
  }

  if (scenario === 'no-exceptions') {
    // 3 PRs in TeamAlpha: sizes [100, 200, 400]
    // Leave-one-out: 400 > 2×150=300 → 1/3=33% < 50% → no exception
    await db.insert(pullRequests).values([
      makePr(alphaId, 1, openedAt, mergedAt, { additions: 100, deletions: 0, changedFiles: 3 }),
      makePr(alphaId, 2, openedAt, mergedAt, { additions: 200, deletions: 0, changedFiles: 5 }),
      makePr(alphaId, 3, openedAt, mergedAt, { additions: 400, deletions: 0, changedFiles: 10 }),
    ])
    return
  }

  // 'with-exceptions': 6 PRs across 2 teams
  // TeamAlpha: [20,20,71,71] — leave-one-out for 71: others=[20,20,71], median=20 → 71>40 ✓
  //   2/4 = 50% flagged → exception fires
  // TeamBeta: [150,300] — only 2 PRs, suppressed (<3 required)
  // Overall median: sorted([20,20,71,71,150,300]) → (71+71)/2 = 71 lines
  const [prAlpha1] = await db
    .insert(pullRequests)
    .values(makePr(alphaId, 1, openedAt, mergedAt, { additions: 20, deletions: 0, changedFiles: 2 }))
    .returning({ id: pullRequests.id })

  await db.insert(pullRequests).values([
    makePr(alphaId, 2, openedAt, mergedAt, { additions: 20, deletions: 0, changedFiles: 2 }),
    makePr(alphaId, 3, openedAt, mergedAt, { additions: 71, deletions: 0, changedFiles: 5 }),
    makePr(alphaId, 4, openedAt, mergedAt, { additions: 71, deletions: 0, changedFiles: 5 }),
    makePr(betaId, 5, openedAt, mergedAt, { additions: 150, deletions: 0, changedFiles: 8 }),
    makePr(betaId, 6, openedAt, mergedAt, { additions: 300, deletions: 0, changedFiles: 15 }),
  ])

  // Add a human review to PR #1 so phase02 section renders
  await db.insert(pullRequestReviews).values({
    pullRequestId: prAlpha1.id,
    githubReviewId: 1001,
    state: 'APPROVED',
    submittedAt: new Date(openedAt.getTime() + 2 * 60 * 60 * 1000),
    authorLogin: 'alice',
    authorType: 'User',
    isBot: false,
  })
}

type SizeFields = { additions: number; deletions: number; changedFiles: number } | null

function makePr(
  repositoryId: string,
  number: number,
  openedAt: Date,
  mergedAt: Date,
  size: SizeFields,
) {
  return {
    repositoryId,
    githubNodeId: `e2e-phase03-${randomUUID()}`,
    number,
    title: `PROJ-${number} test PR`,
    state: 'merged',
    openedAt,
    githubUpdatedAt: mergedAt,
    mergedAt,
    url: `https://github.com/gde-mit/svc-test/pull/${number}`,
    additions: size?.additions ?? null,
    deletions: size?.deletions ?? null,
    changedFiles: size?.changedFiles ?? null,
  }
}
