import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

describe.skipIf(!hasDatabaseUrl)('db migrations', () => {
  let db: ReturnType<typeof createDb>

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  it('db_migrations_create_schema', async () => {
    const rows = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN ('repositories', 'pull_requests', 'sync_runs', 'sync_errors')
    `)
    expect(rows[0]?.c).toBe(4)
  })

  it('db_client_executes_query', async () => {
    const rows = await db.execute<{ one: number }>(sql`SELECT 1 AS one`)
    expect(rows[0]?.one).toBe(1)
  })

  it('db_constraints_reject_duplicate_repository_path', async () => {
    const dupPath = `/test-dup-repo-path-${crypto.randomUUID()}`
    await db.insert(repositories).values({
      name: 'first',
      path: dupPath,
      rootPath: '/',
      scanStatus: 'ready',
    })
    await expect(
      db.insert(repositories).values({
        name: 'second',
        path: dupPath,
        rootPath: '/',
        scanStatus: 'ready',
      }),
    ).rejects.toThrow()
  })

  it('db_constraints_reject_duplicate_pr_number_per_repository', async () => {
    const basePath = `/test-dup-pr-path-${crypto.randomUUID()}`
    const [repo] = await db
      .insert(repositories)
      .values({
        name: 'repo',
        path: basePath,
        rootPath: '/',
        scanStatus: 'ready',
      })
      .returning({ id: repositories.id })

    const opened = new Date('2026-01-01T00:00:00.000Z')
    const updated = new Date('2026-01-02T00:00:00.000Z')

    await db.insert(pullRequests).values({
      repositoryId: repo.id,
      githubNodeId: `node-${crypto.randomUUID()}`,
      number: 42,
      title: 'first PR',
      state: 'MERGED',
      openedAt: opened,
      githubUpdatedAt: updated,
      url: 'https://github.com/o/r/pull/42',
    })

    await expect(
      db.insert(pullRequests).values({
        repositoryId: repo.id,
        githubNodeId: `node-${crypto.randomUUID()}`,
        number: 42,
        title: 'duplicate number',
        state: 'OPEN',
        openedAt: opened,
        githubUpdatedAt: updated,
        url: 'https://github.com/o/r/pull/42-dup',
      }),
    ).rejects.toThrow()
  })
})
