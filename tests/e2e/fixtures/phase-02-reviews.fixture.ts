import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import type { AppDb } from '~/db/client'
import {
  pullRequestReviewComments,
  pullRequestReviews,
  pullRequests,
  repositories,
} from '~/db/schema'

export type Phase02SeedResult = {
  repoSyncedId: string
  repoUnsyncedId: string
  mergeWithoutReviewPrId: string
  qualifyingHumanPrId: string
  botOnlyPrId: string
}

export async function seedPhase02Reviews(
  db: AppDb,
  options: { repoRoot: string; nowIso?: string } = { repoRoot: '/tmp/phase-02-fixture' },
): Promise<Phase02SeedResult> {
  const now = options.nowIso ? new Date(options.nowIso) : new Date()
  const mapping: TeamMappingConfig = {
    teams: [
      { name: 'TeamA', repoPatterns: ['svc-synced'] },
      { name: 'TeamB', repoPatterns: ['svc-unsynced'] },
    ],
  }
  const cands: RepositoryCandidate[] = [
    {
      name: 'svc-synced',
      path: path.join(options.repoRoot, `svc-synced-${randomUUID()}`),
      rootPath: options.repoRoot,
      remoteUrl: 'https://github.com/gde-mit/svc-synced.git',
      owner: 'gde-mit',
      repo: 'svc-synced',
    },
    {
      name: 'svc-unsynced',
      path: path.join(options.repoRoot, `svc-unsynced-${randomUUID()}`),
      rootPath: options.repoRoot,
      remoteUrl: 'https://github.com/gde-mit/svc-unsynced.git',
      owner: 'gde-mit',
      repo: 'svc-unsynced',
    },
  ]
  await upsertRepositories(db, options.repoRoot, cands, mapping, 'gde-mit')
  const repoRows = await db.select().from(repositories)
  const synced = repoRows.find((r) => r.repo === 'svc-synced')!
  const unsynced = repoRows.find((r) => r.repo === 'svc-unsynced')!
  await db
    .update(repositories)
    .set({ lastReviewSyncedAt: now })
    .where(eq(repositories.id, synced.id))

  // qualifying-human PR
  const merged1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const opened1 = new Date(merged1.getTime() - 24 * 60 * 60 * 1000)
  const [prHuman] = await db
    .insert(pullRequests)
    .values({
      repositoryId: synced.id,
      githubNodeId: `node-${randomUUID()}`,
      number: 1,
      title: 'PROJ-1 add feature',
      state: 'merged',
      openedAt: opened1,
      githubUpdatedAt: merged1,
      mergedAt: merged1,
      url: 'https://example.com/pr/1',
    })
    .returning({ id: pullRequests.id })

  await db.insert(pullRequestReviews).values({
    pullRequestId: prHuman.id,
    githubReviewId: 1001,
    state: 'APPROVED',
    submittedAt: new Date(opened1.getTime() + 2 * 60 * 60 * 1000),
    authorLogin: 'alice',
    authorType: 'User',
    isBot: false,
  })

  // bot-only PR
  const [prBot] = await db
    .insert(pullRequests)
    .values({
      repositoryId: synced.id,
      githubNodeId: `node-${randomUUID()}`,
      number: 2,
      title: 'PROJ-2 bot-only',
      state: 'merged',
      openedAt: opened1,
      githubUpdatedAt: merged1,
      mergedAt: merged1,
      url: 'https://example.com/pr/2',
    })
    .returning({ id: pullRequests.id })
  await db.insert(pullRequestReviews).values({
    pullRequestId: prBot.id,
    githubReviewId: 2001,
    state: 'APPROVED',
    submittedAt: new Date(opened1.getTime() + 60 * 60 * 1000),
    authorLogin: 'dependabot[bot]',
    authorType: 'Bot',
    isBot: true,
  })

  // merge-without-review PR (≤7m, no reviews)
  const opened3 = new Date(merged1.getTime() - 60 * 1000)
  const [prMwr] = await db
    .insert(pullRequests)
    .values({
      repositoryId: synced.id,
      githubNodeId: `node-${randomUUID()}`,
      number: 3,
      title: 'PROJ-3 hygiene',
      state: 'merged',
      openedAt: opened3,
      githubUpdatedAt: merged1,
      mergedAt: merged1,
      url: 'https://example.com/pr/3',
    })
    .returning({ id: pullRequests.id })

  void pullRequestReviewComments

  return {
    repoSyncedId: synced.id,
    repoUnsyncedId: unsynced.id,
    qualifyingHumanPrId: prHuman.id,
    botOnlyPrId: prBot.id,
    mergeWithoutReviewPrId: prMwr.id,
  }
}

export async function resetPhase02Reviews(db: AppDb): Promise<void> {
  await db.delete(pullRequestReviewComments)
  await db.delete(pullRequestReviews)
  await db.delete(pullRequests)
  await db.delete(repositories)
}
