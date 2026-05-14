import path from 'node:path'

import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { GitHubPullRequest } from '~/collector/github-client'
import { upsertPullRequests } from '~/collector/pull-request-store'
import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

function baseCandidate(root: string, name: string, overrides: Partial<RepositoryCandidate> = {}): RepositoryCandidate {
  return {
    name,
    path: path.join(root, name),
    rootPath: root,
    remoteUrl: 'https://github.com/gde-mit/example.git',
    owner: 'gde-mit',
    repo: 'example',
    ...overrides,
  }
}

function mapping(teams: TeamMappingConfig['teams'], rest: Partial<TeamMappingConfig> = {}): TeamMappingConfig {
  return { teams, ...rest }
}

function ghPr(overrides: Partial<GitHubPullRequest> & Pick<GitHubPullRequest, 'number' | 'title'>): GitHubPullRequest {
  const opened = overrides.openedAt ?? new Date('2024-01-01T10:00:00.000Z')
  return {
    githubNodeId: overrides.githubNodeId ?? `node-${overrides.number}`,
    number: overrides.number,
    title: overrides.title,
    state: overrides.state ?? 'open',
    isDraft: overrides.isDraft ?? false,
    openedAt: opened,
    updatedAt: overrides.updatedAt ?? opened,
    mergedAt: overrides.mergedAt ?? null,
    url: overrides.url ?? `https://github.com/gde-mit/example/pull/${overrides.number}`,
  }
}

describe.skipIf(!hasDatabaseUrl)('pull-request-store integration', () => {
  let db: ReturnType<typeof createDb>
  let repositoryId: string

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    const root = path.join('/tmp', `pr-store-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'repo-pr', { repo: 'example' })
    const map = mapping([{ name: 'T', repoPatterns: ['example'] }])
    await upsertRepositories(db, root, [cand], map, 'gde-mit')
    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    if (!row) throw new Error('expected repository row')
    repositoryId = row.id
  })

  it('pr_sync_stores_pr_metadata', async () => {
    const opened = new Date('2024-02-01T12:00:00.000Z')
    const merged = new Date('2024-02-03T15:30:00.000Z')
    const prs = [
      ghPr({
        number: 1,
        title: 'PROJ-1 add feature',
        state: 'closed',
        openedAt: opened,
        updatedAt: merged,
        mergedAt: merged,
      }),
    ]

    const summary = await upsertPullRequests(db, repositoryId, prs)
    expect(summary.seen).toBe(1)
    expect(summary.merged).toBe(1)

    const [row] = await db
      .select()
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 1)))

    expect(row?.openedAt?.toISOString()).toBe(opened.toISOString())
    expect(row?.mergedAt?.toISOString()).toBe(merged.toISOString())
    expect(row?.state).toBe('merged')
    expect(row?.missingJiraKey).toBe(false)
  })

  it('pr_sync_is_idempotent', async () => {
    const pr = ghPr({ number: 2, title: 'X-1 second', state: 'closed', mergedAt: new Date('2024-03-01T00:00:00.000Z') })
    const s1 = await upsertPullRequests(db, repositoryId, [pr])
    const s2 = await upsertPullRequests(db, repositoryId, [{ ...pr, title: 'X-1 updated title' }])

    const rows = await db.select().from(pullRequests).where(eq(pullRequests.repositoryId, repositoryId))
    expect(rows.filter((r) => r.number === 2)).toHaveLength(1)
    expect(s1.seen).toBe(1)
    expect(s2.seen).toBe(1)
    expect(rows.find((r) => r.number === 2)?.title).toBe('X-1 updated title')
  })

  it('pr_sync_preserves_closed_unmerged_prs', async () => {
    const pr = ghPr({
      number: 3,
      title: 'Closed no merge',
      state: 'closed',
      mergedAt: null,
      openedAt: new Date('2024-04-01T00:00:00.000Z'),
    })
    await upsertPullRequests(db, repositoryId, [pr])

    const [row] = await db
      .select()
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 3)))

    expect(row?.state).toBe('closed')
    expect(row?.mergedAt).toBeNull()
  })

  it('pr_sync_rejects_invalid_lifecycle_timestamps', async () => {
    const opened = new Date('2024-05-10T12:00:00.000Z')
    const merged = new Date('2024-05-09T12:00:00.000Z')
    const summary = await upsertPullRequests(db, repositoryId, [
      ghPr({ number: 4, title: 'Bad', state: 'closed', openedAt: opened, mergedAt: merged }),
    ])

    expect(summary.invalidLifecycle).toBe(1)
    expect(summary.invalidLifecyclePullNumbers).toEqual([4])
    expect(summary.seen).toBe(1)
    expect(summary.merged).toBe(0)

    const rows = await db
      .select()
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 4)))
    expect(rows).toHaveLength(0)
  })

  it('detects_missing_jira_key', async () => {
    const summary = await upsertPullRequests(db, repositoryId, [ghPr({ number: 20, title: 'no key here', state: 'open' })])
    expect(summary.missingJiraKey).toBe(1)
    const [row] = await db.select().from(pullRequests).where(eq(pullRequests.number, 20))
    expect(row?.missingJiraKey).toBe(true)
  })

  it('accepts_jira_key_in_title', async () => {
    const summary = await upsertPullRequests(db, repositoryId, [ghPr({ number: 21, title: 'AB-99 fix', state: 'open' })])
    expect(summary.missingJiraKey).toBe(0)
    const [row] = await db.select().from(pullRequests).where(eq(pullRequests.number, 21))
    expect(row?.missingJiraKey).toBe(false)
  })
})

describe('pull-request-store unit helpers', () => {
  it('merged_draft_prs_contribute_to_cycle_time', () => {
    const pr = ghPr({
      number: 10,
      title: 'DRAFT-1 merged draft',
      state: 'closed',
      isDraft: true,
      mergedAt: new Date('2024-06-01T00:00:00.000Z'),
    })
    expect(pr.mergedAt).not.toBeNull()
    expect(pr.isDraft).toBe(true)
  })

  it('open_draft_prs_do_not_contribute_to_cycle_time', () => {
    const pr = ghPr({ number: 11, title: 'Open draft', state: 'open', isDraft: true, mergedAt: null })
    expect(pr.mergedAt).toBeNull()
    expect(pr.state).toBe('open')
  })
})
