import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb, runMigrations } from '~/db/client'
import {
  pullRequestReviews,
  pullRequests,
  repositories,
  syncErrors,
  syncRuns,
} from '~/db/schema'
import {
  resetPhase02Reviews,
  seedPhase02Reviews,
} from '../e2e/fixtures/phase-02-reviews.fixture'

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

describe.skipIf(!hasDatabaseUrl)('phase-02 review fixture', () => {
  let db: ReturnType<typeof createDb>

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
    await db.delete(syncErrors)
    await db.delete(syncRuns)
  })

  afterAll(async () => {
    await resetPhase02Reviews(db)
    await db.$client.end({ timeout: 5 })
  })

  it('phase_02_fixture_seeds_expected_row_counts_in_local_db', async () => {
    await resetPhase02Reviews(db)
    const out = await seedPhase02Reviews(db, { repoRoot: '/tmp/phase-02-fixture-test' })
    const allRepos = await db.select().from(repositories)
    expect(allRepos.length).toBe(2)
    const synced = allRepos.find((r) => r.id === out.repoSyncedId)
    const unsynced = allRepos.find((r) => r.id === out.repoUnsyncedId)
    expect(synced?.lastReviewSyncedAt).not.toBeNull()
    expect(unsynced?.lastReviewSyncedAt).toBeNull()
    const prRows = await db.select().from(pullRequests)
    expect(prRows.length).toBe(3)
    const reviewRows = await db.select().from(pullRequestReviews)
    expect(reviewRows.length).toBe(2)
    const mwrPr = await db
      .select()
      .from(pullRequestReviews)
      .where(eq(pullRequestReviews.pullRequestId, out.mergeWithoutReviewPrId))
    expect(mwrPr.length).toBe(0)
  })
})
