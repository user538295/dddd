import { readdirSync } from 'node:fs'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, runMigrations } from '~/db/client'
import { pullRequestReviews, pullRequests, repositories } from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()

const drizzleDir = path.resolve(process.cwd(), 'drizzle')

describe('phase 02 migration filesystem invariants', () => {
  it('migration_includes_phase02_file', () => {
    const files = readdirSync(drizzleDir).filter((f) => /^\d{4}_.*\.sql$/.test(f))
    const phase02 = files.filter((f) => f.startsWith('0001_'))
    expect(phase02.length, `expected exactly one 0001_*.sql migration, got: ${files.join(', ')}`).toBe(1)
  })
})

describe('phase 02 migrations', () => {
  let db: ReturnType<typeof createDb>

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  it('migration_creates_pull_request_reviews_table', async () => {
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pull_request_reviews'
    `)
    expect(rows[0]?.c).toBe(1)
  })

  it('migration_creates_pull_request_review_comments_table', async () => {
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pull_request_review_comments'
    `)
    expect(rows[0]?.c).toBe(1)
  })

  it('migration_adds_last_review_synced_at', async () => {
    const rows = await db.execute<{ c: number; data_type: string; is_nullable: string }>(sql`
      SELECT COUNT(*)::int AS c, MIN(data_type) AS data_type, MIN(is_nullable) AS is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'repositories'
        AND column_name = 'last_review_synced_at'
    `)
    expect(rows[0]?.c).toBe(1)
    expect(rows[0]?.data_type).toMatch(/timestamp/i)
    expect(rows[0]?.is_nullable).toBe('YES')
  })

  it('migration_applies_on_fresh_db', async () => {
    await runMigrations(databaseUrl)
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('repositories', 'pull_requests', 'pull_request_reviews', 'pull_request_review_comments')
    `)
    expect(rows[0]?.c).toBe(4)
  })

  it('migration_applies_on_phase01_db', async () => {
    await expect(runMigrations(databaseUrl)).resolves.not.toThrow()
  })

  it('migration_applies_idempotently_on_phase_01_db', async () => {
    await runMigrations(databaseUrl)
    await runMigrations(databaseUrl)
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pull_request_reviews'
    `)
    expect(rows[0]?.c).toBe(1)
  })

  it('migration_creates_idx_pull_request_review_comments_pr_id', async () => {
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'pull_request_review_comments'
        AND indexname = 'idx_pull_request_review_comments_pr_id'
    `)
    expect(rows[0]?.c).toBe(1)
  })

  it('pull_request_reviews_unique_per_github_review_id', async () => {
    const repoPath = `/test-phase02-${crypto.randomUUID()}`
    const [repo] = await db
      .insert(repositories)
      .values({ name: 'r', path: repoPath, rootPath: '/', scanStatus: 'ready' })
      .returning({ id: repositories.id })

    const [pr] = await db
      .insert(pullRequests)
      .values({
        repositoryId: repo.id,
        githubNodeId: `node-${crypto.randomUUID()}`,
        number: 1,
        title: 'pr',
        state: 'OPEN',
        openedAt: new Date('2026-01-01T00:00:00Z'),
        githubUpdatedAt: new Date('2026-01-02T00:00:00Z'),
        url: 'https://example.com/pr/1',
      })
      .returning({ id: pullRequests.id })

    const reviewId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`)
    await db.insert(pullRequestReviews).values({
      pullRequestId: pr.id,
      githubReviewId: reviewId,
      state: 'APPROVED',
      isBot: false,
    })
    await expect(
      db.insert(pullRequestReviews).values({
        pullRequestId: pr.id,
        githubReviewId: reviewId,
        state: 'APPROVED',
        isBot: false,
      }),
    ).rejects.toThrow()
  })
})
