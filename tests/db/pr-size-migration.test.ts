import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()

const sizeColumns = [
  { name: 'additions', dataType: 'integer' },
  { name: 'deletions', dataType: 'integer' },
  { name: 'changed_files', dataType: 'integer' },
  { name: 'merge_commit_sha', dataType: 'text' },
] as const

describe('pr size migration', () => {
  let db: ReturnType<typeof createDb>

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  it('migration_adds_additions_deletions_changed_files_merge_commit_sha', async () => {
    for (const { name, dataType } of sizeColumns) {
      const rows = await db.execute<{ c: number; data_type: string; is_nullable: string }>(sql`
        SELECT COUNT(*)::int AS c, MIN(data_type) AS data_type, MIN(is_nullable) AS is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pull_requests'
          AND column_name = ${name}
      `)
      expect(rows[0]?.c, `column ${name} missing`).toBe(1)
      expect(rows[0]?.data_type).toBe(dataType)
      expect(rows[0]?.is_nullable).toBe('YES')
    }

    const repoPath = `/test-pr-size-migration-${crypto.randomUUID()}`
    const [repo] = await db
      .insert(repositories)
      .values({ name: 'r', path: repoPath, rootPath: '/', scanStatus: 'ready' })
      .returning({ id: repositories.id })

    const [pr] = await db
      .insert(pullRequests)
      .values({
        repositoryId: repo.id,
        githubNodeId: `node-${crypto.randomUUID()}`,
        number: 99,
        title: 'existing row',
        state: 'MERGED',
        openedAt: new Date('2026-01-01T00:00:00Z'),
        githubUpdatedAt: new Date('2026-01-02T00:00:00Z'),
        url: 'https://example.com/pr/99',
      })
      .returning({
        additions: pullRequests.additions,
        deletions: pullRequests.deletions,
        changedFiles: pullRequests.changedFiles,
        mergeCommitSha: pullRequests.mergeCommitSha,
      })

    expect(pr.additions).toBeNull()
    expect(pr.deletions).toBeNull()
    expect(pr.changedFiles).toBeNull()
    expect(pr.mergeCommitSha).toBeNull()
  })

  it('migration_applies_on_phase02_db', async () => {
    await expect(runMigrations(databaseUrl)).resolves.not.toThrow()

    const repoPath = `/test-phase02-pr-size-${crypto.randomUUID()}`
    const [repo] = await db
      .insert(repositories)
      .values({ name: 'r', path: repoPath, rootPath: '/', scanStatus: 'ready' })
      .returning({ id: repositories.id })

    const [pr] = await db
      .insert(pullRequests)
      .values({
        repositoryId: repo.id,
        githubNodeId: `node-${crypto.randomUUID()}`,
        number: 7,
        title: 'phase02 columns only',
        state: 'MERGED',
        isDraft: false,
        openedAt: new Date('2026-02-01T00:00:00Z'),
        githubUpdatedAt: new Date('2026-02-02T00:00:00Z'),
        mergedAt: new Date('2026-02-03T00:00:00Z'),
        url: 'https://example.com/pr/7',
        missingJiraKey: false,
      })
      .returning({
        additions: pullRequests.additions,
        deletions: pullRequests.deletions,
        changedFiles: pullRequests.changedFiles,
        mergeCommitSha: pullRequests.mergeCommitSha,
      })

    expect(pr.additions).toBeNull()
    expect(pr.deletions).toBeNull()
    expect(pr.changedFiles).toBeNull()
    expect(pr.mergeCommitSha).toBeNull()
  })
})
