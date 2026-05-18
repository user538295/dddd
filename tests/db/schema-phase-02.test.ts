import { getTableColumns } from 'drizzle-orm/utils'
import { describe, expect, it } from 'vitest'
import {
  pullRequestReviewComments,
  pullRequestReviews,
  pullRequests,
  repositories,
} from '~/db/schema'

describe('phase 02 db schema additions', () => {
  it('schema_defines_pull_request_reviews_table', () => {
    expect(pullRequestReviews).toBeDefined()
    const cols = getTableColumns(pullRequestReviews)
    expect(cols.id).toBeDefined()
    expect(cols.pullRequestId).toBeDefined()
    expect(cols.githubReviewId).toBeDefined()
    expect(cols.state).toBeDefined()
    expect(cols.submittedAt).toBeDefined()
    expect(cols.authorLogin).toBeDefined()
    expect(cols.authorType).toBeDefined()
    expect(cols.isBot).toBeDefined()
    expect(cols.createdAt).toBeDefined()
    expect(cols.submittedAt.notNull).toBe(false)
    expect(cols.authorLogin.notNull).toBe(false)
    expect(cols.authorType.notNull).toBe(false)
    expect(cols.isBot.notNull).toBe(true)
    expect(cols.pullRequestId.notNull).toBe(true)
    expect(cols.githubReviewId.notNull).toBe(true)
    expect(cols.state.notNull).toBe(true)
    expect(cols.submittedAt.getSQLType().toLowerCase()).toContain('time zone')
    expect(cols.createdAt.getSQLType().toLowerCase()).toContain('time zone')
  })

  it('schema_defines_pull_request_review_comments_table', () => {
    expect(pullRequestReviewComments).toBeDefined()
    const cols = getTableColumns(pullRequestReviewComments)
    expect(cols.id).toBeDefined()
    expect(cols.pullRequestId).toBeDefined()
    expect(cols.githubCommentId).toBeDefined()
    expect(cols.createdAt).toBeDefined()
    expect(cols.pullRequestId.notNull).toBe(true)
    expect(cols.githubCommentId.notNull).toBe(true)
    expect(cols.createdAt.notNull).toBe(true)
    expect(cols.createdAt.getSQLType().toLowerCase()).toContain('time zone')
  })

  it('schema_repositories_has_last_review_synced_at', () => {
    const cols = getTableColumns(repositories)
    expect(cols.lastReviewSyncedAt).toBeDefined()
    expect(cols.lastReviewSyncedAt.notNull).toBe(false)
    expect(cols.lastReviewSyncedAt.getSQLType().toLowerCase()).toContain('time zone')
  })

  it('schema_pull_requests_retains_phase01_columns', () => {
    const phase01 = [
      'id',
      'repositoryId',
      'githubNodeId',
      'number',
      'title',
      'state',
      'isDraft',
      'openedAt',
      'githubUpdatedAt',
      'mergedAt',
      'url',
      'missingJiraKey',
      'createdAt',
      'updatedAt',
    ]
    const actual = new Set(Object.keys(getTableColumns(pullRequests)))
    for (const col of phase01) {
      expect(actual.has(col), `missing phase01 column ${col}`).toBe(true)
    }
  })
})
