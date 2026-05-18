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
    mergeCommitSha: overrides.mergeCommitSha ?? null,
    url: overrides.url ?? `https://github.com/gde-mit/example/pull/${overrides.number}`,
  }
}

describe('pull-request-store mergeCommitSha', () => {
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
    const root = path.join('/tmp', `pr-store-size-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'repo-pr-size', { repo: 'example' })
    const map = mapping([{ name: 'T', repoPatterns: ['example'] }])
    await upsertRepositories(db, root, [cand], map, 'gde-mit')
    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    if (!row) throw new Error('expected repository row')
    repositoryId = row.id
  })

  it('upsert_pr_stores_merge_commit_sha', async () => {
    const pr = ghPr({
      number: 10,
      title: 'PROJ-10 merge sha',
      state: 'closed',
      mergedAt: new Date('2024-05-01T00:00:00.000Z'),
      mergeCommitSha: 'abc',
    })

    await upsertPullRequests(db, repositoryId, [pr])

    const [row] = await db
      .select({ mergeCommitSha: pullRequests.mergeCommitSha })
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 10)))

    expect(row?.mergeCommitSha).toBe('abc')
  })

  it('upsert_pr_stores_null_merge_commit_sha', async () => {
    const pr = ghPr({
      number: 11,
      title: 'PROJ-11 no merge sha',
      state: 'open',
      mergeCommitSha: null,
    })

    await upsertPullRequests(db, repositoryId, [pr])

    const [row] = await db
      .select({ mergeCommitSha: pullRequests.mergeCommitSha })
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 11)))

    expect(row?.mergeCommitSha).toBeNull()
  })

  it('upsert_pr_updates_merge_commit_sha_on_second_upsert', async () => {
    const pr = ghPr({
      number: 12,
      title: 'PROJ-12 sha update',
      state: 'closed',
      mergedAt: new Date('2024-06-01T00:00:00.000Z'),
      mergeCommitSha: null,
    })

    await upsertPullRequests(db, repositoryId, [pr])
    await upsertPullRequests(db, repositoryId, [{ ...pr, mergeCommitSha: 'abc' }])

    const [row] = await db
      .select({ mergeCommitSha: pullRequests.mergeCommitSha })
      .from(pullRequests)
      .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, 12)))

    expect(row?.mergeCommitSha).toBe('abc')
  })
})
