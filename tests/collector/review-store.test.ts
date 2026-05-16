import path from 'node:path'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { GitHubReview, GitHubReviewComment } from '~/collector/github-client'
import { upsertReviewsForPr } from '~/collector/review-store'
import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import { createDb, runMigrations } from '~/db/client'
import {
  pullRequestReviewComments,
  pullRequestReviews,
  pullRequests,
  repositories,
} from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

function review(overrides: Partial<GitHubReview> & { id: number }): GitHubReview {
  return {
    id: overrides.id,
    state: overrides.state ?? 'APPROVED',
    submittedAt: overrides.submittedAt ?? new Date('2026-04-01T10:00:00Z'),
    user: overrides.user === undefined ? { login: 'alice', type: 'User' } : overrides.user,
  }
}

function comment(id: number, createdAt: Date): GitHubReviewComment {
  return { id, createdAt }
}

describe.skipIf(!hasDatabaseUrl)('review-store integration', () => {
  let db: ReturnType<typeof createDb>
  let pullRequestId: string
  const mergedAt = new Date('2026-04-05T12:00:00Z')

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    const root = path.join('/tmp', `review-store-${crypto.randomUUID()}`)
    const cand: RepositoryCandidate = {
      name: 'repo-rev',
      path: path.join(root, 'repo-rev'),
      rootPath: root,
      remoteUrl: 'https://github.com/gde-mit/example.git',
      owner: 'gde-mit',
      repo: 'example',
    }
    const map: TeamMappingConfig = { teams: [{ name: 'T', repoPatterns: ['example'] }] }
    await upsertRepositories(db, root, [cand], map, 'gde-mit')
    const [repoRow] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    if (!repoRow) throw new Error('expected repository row')

    const [pr] = await db
      .insert(pullRequests)
      .values({
        repositoryId: repoRow.id,
        githubNodeId: `node-${crypto.randomUUID()}`,
        number: Math.floor(Math.random() * 100000),
        title: 'PROJ-1 rev',
        state: 'merged',
        openedAt: new Date('2026-04-01T08:00:00Z'),
        githubUpdatedAt: mergedAt,
        mergedAt,
        url: 'https://example.com/pr',
      })
      .returning({ id: pullRequests.id })
    pullRequestId = pr.id
  })

  it('review_store_upserts_reviews_idempotently', async () => {
    const reviews = [review({ id: 1 }), review({ id: 2 })]
    await upsertReviewsForPr(db, { pullRequestId, mergedAt, reviews, comments: [] })
    await upsertReviewsForPr(db, { pullRequestId, mergedAt, reviews, comments: [] })

    const rows = await db
      .select()
      .from(pullRequestReviews)
      .where(eq(pullRequestReviews.pullRequestId, pullRequestId))
    expect(rows).toHaveLength(2)
  })

  it('review_store_recomputes_on_dismissed_review', async () => {
    await upsertReviewsForPr(db, {
      pullRequestId,
      mergedAt,
      reviews: [review({ id: 1 }), review({ id: 2 })],
      comments: [],
    })
    await upsertReviewsForPr(db, {
      pullRequestId,
      mergedAt,
      reviews: [review({ id: 1 })],
      comments: [],
    })
    const rows = await db
      .select()
      .from(pullRequestReviews)
      .where(eq(pullRequestReviews.pullRequestId, pullRequestId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.githubReviewId).toBe(1)
  })

  it('review_store_persists_pre_merge_comment_count', async () => {
    const result = await upsertReviewsForPr(db, {
      pullRequestId,
      mergedAt,
      reviews: [],
      comments: [
        comment(101, new Date('2026-04-03T10:00:00Z')),
        comment(102, new Date('2026-04-04T10:00:00Z')),
        comment(103, new Date('2026-04-06T10:00:00Z')),
      ],
    })
    expect(result.preMergeCommentCount).toBe(2)
    const rows = await db
      .select()
      .from(pullRequestReviewComments)
      .where(eq(pullRequestReviewComments.pullRequestId, pullRequestId))
    expect(rows).toHaveLength(2)
  })

  it('review_comment_count_excludes_post_merge', async () => {
    const result = await upsertReviewsForPr(db, {
      pullRequestId,
      mergedAt,
      reviews: [],
      comments: [comment(201, mergedAt), comment(202, new Date(mergedAt.getTime() - 1))],
    })
    expect(result.preMergeCommentCount).toBe(1)
  })

  it('review_store_classifies_bot_at_write_time', async () => {
    await upsertReviewsForPr(db, {
      pullRequestId,
      mergedAt,
      reviews: [
        review({ id: 1, user: { login: 'human', type: 'User' } }),
        review({ id: 2, user: { login: 'dependabot[bot]', type: 'Bot' } }),
      ],
      comments: [],
    })
    const rows = await db
      .select()
      .from(pullRequestReviews)
      .where(eq(pullRequestReviews.pullRequestId, pullRequestId))
    const byId = new Map(rows.map((r) => [r.githubReviewId, r.isBot]))
    expect(byId.get(1)).toBe(false)
    expect(byId.get(2)).toBe(true)
  })
})
