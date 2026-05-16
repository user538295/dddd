import { eq } from 'drizzle-orm'

import { isBotReviewer } from '~/collector/bot-identity'
import type { GitHubReview, GitHubReviewComment } from '~/collector/github-client'
import type { AppDb } from '~/db/client'
import { pullRequestReviewComments, pullRequestReviews } from '~/db/schema'

export type UpsertReviewsInput = {
  pullRequestId: string
  mergedAt: Date
  reviews: GitHubReview[]
  comments: GitHubReviewComment[]
}

export type UpsertReviewsResult = {
  reviewsWritten: number
  preMergeCommentCount: number
}

export async function upsertReviewsForPr(
  db: AppDb,
  input: UpsertReviewsInput,
): Promise<UpsertReviewsResult> {
  const mergedMs = input.mergedAt.getTime()
  const preMergeComments = input.comments.filter((c) => c.createdAt.getTime() < mergedMs)

  return db.transaction(async (tx) => {
    await tx.delete(pullRequestReviews).where(eq(pullRequestReviews.pullRequestId, input.pullRequestId))
    await tx.delete(pullRequestReviewComments).where(eq(pullRequestReviewComments.pullRequestId, input.pullRequestId))

    if (input.reviews.length > 0) {
      await tx.insert(pullRequestReviews).values(
        input.reviews.map((r) => ({
          pullRequestId: input.pullRequestId,
          githubReviewId: r.id,
          state: r.state,
          submittedAt: r.submittedAt,
          authorLogin: r.user?.login ?? null,
          authorType: r.user?.type ?? null,
          isBot: isBotReviewer(r.user),
        })),
      )
    }

    if (preMergeComments.length > 0) {
      await tx.insert(pullRequestReviewComments).values(
        preMergeComments.map((c) => ({
          pullRequestId: input.pullRequestId,
          githubCommentId: c.id,
          createdAt: c.createdAt,
        })),
      )
    }

    return {
      reviewsWritten: input.reviews.length,
      preMergeCommentCount: preMergeComments.length,
    }
  })
}
