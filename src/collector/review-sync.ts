import { and, eq, gt, isNotNull } from 'drizzle-orm'

import type { GitHubClient } from '~/collector/github-client'
import { GitHubSyncError } from '~/collector/github-client'
import { upsertReviewsForPr } from '~/collector/review-store'
import type { AppDb } from '~/db/client'
import { pullRequests, repositories, syncErrors } from '~/db/schema'

export type ReviewSyncStatus = 'success' | 'partial' | 'skipped'

export type ReviewSyncPerPrError = {
  pullRequestId: string
  pullNumber: number
  message: string
}

export type ReviewSyncResult = {
  status: ReviewSyncStatus
  perPrErrors: ReviewSyncPerPrError[]
  prsAttempted: number
  prsSucceeded: number
}

export type ReviewSyncRepo = {
  id: string
  owner: string | null
  repo: string | null
  lastReviewSyncedAt: Date | null
}

export type ReviewSyncDeps = {
  client: GitHubClient
  now: Date
  syncRunId: string
}

export async function syncRepositoryReviews(
  db: AppDb,
  deps: ReviewSyncDeps,
  repo: ReviewSyncRepo,
): Promise<ReviewSyncResult> {
  if (repo.owner === null || repo.repo === null) {
    return { status: 'skipped', perPrErrors: [], prsAttempted: 0, prsSucceeded: 0 }
  }

  const baseWhere = and(
    eq(pullRequests.repositoryId, repo.id),
    eq(pullRequests.state, 'merged'),
    isNotNull(pullRequests.mergedAt),
  )

  const rows = await db
    .select({
      id: pullRequests.id,
      number: pullRequests.number,
      mergedAt: pullRequests.mergedAt,
      githubUpdatedAt: pullRequests.githubUpdatedAt,
    })
    .from(pullRequests)
    .where(
      repo.lastReviewSyncedAt === null
        ? baseWhere
        : and(baseWhere, gt(pullRequests.githubUpdatedAt, repo.lastReviewSyncedAt)),
    )

  const perPrErrors: ReviewSyncPerPrError[] = []
  let prsAttempted = 0
  let prsSucceeded = 0
  let rateLimited = false

  for (const pr of rows) {
    if (rateLimited) break
    if (pr.mergedAt === null) continue
    prsAttempted += 1
    try {
      const [reviews, comments] = await Promise.all([
        deps.client.listPullRequestReviews({
          owner: repo.owner,
          repo: repo.repo,
          pullNumber: pr.number,
        }),
        deps.client.listPullRequestReviewComments({
          owner: repo.owner,
          repo: repo.repo,
          pullNumber: pr.number,
        }),
      ])
      await upsertReviewsForPr(db, {
        pullRequestId: pr.id,
        mergedAt: pr.mergedAt,
        reviews,
        comments,
      })
      prsSucceeded += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (err instanceof GitHubSyncError && err.code === 'rate_limited') {
        rateLimited = true
      }
      perPrErrors.push({ pullRequestId: pr.id, pullNumber: pr.number, message: msg })
      await db.insert(syncErrors).values({
        syncRunId: deps.syncRunId,
        repositoryId: repo.id,
        source: 'github_reviews',
        message: msg,
      })
    }
  }

  let status: ReviewSyncStatus
  if (perPrErrors.length === 0) {
    status = 'success'
    await db
      .update(repositories)
      .set({ lastReviewSyncedAt: deps.now, updatedAt: new Date() })
      .where(eq(repositories.id, repo.id))
  } else {
    status = 'partial'
  }

  return { status, perPrErrors, prsAttempted, prsSucceeded }
}
