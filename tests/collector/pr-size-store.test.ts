import path from 'node:path'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { GitHubPullRequest } from '~/collector/github-client'
import { upsertPullRequests } from '~/collector/pull-request-store'
import { updatePrSize } from '~/collector/pr-size-store'
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

describe('pr-size-store updatePrSize', () => {
  let db: ReturnType<typeof createDb>
  let repositoryId: string
  let pullRequestId: string

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(async () => {
    const root = path.join('/tmp', `pr-size-store-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'repo-pr-size-store', { repo: 'example' })
    const map = mapping([{ name: 'T', repoPatterns: ['example'] }])
    await upsertRepositories(db, root, [cand], map, 'gde-mit')
    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    if (!row) throw new Error('expected repository row')
    repositoryId = row.id

    const pr = ghPr({
      number: Math.floor(Math.random() * 100000),
      title: 'PROJ-size-store',
      state: 'closed',
      mergedAt: new Date('2024-05-01T00:00:00.000Z'),
    })
    await upsertPullRequests(db, repositoryId, [pr])

    const [prRow] = await db
      .select({ id: pullRequests.id })
      .from(pullRequests)
      .where(eq(pullRequests.repositoryId, repositoryId))
    if (!prRow) throw new Error('expected pull request row')
    pullRequestId = prRow.id
  })

  async function readSizeRow() {
    const [row] = await db
      .select({
        additions: pullRequests.additions,
        deletions: pullRequests.deletions,
        changedFiles: pullRequests.changedFiles,
        mergeCommitSha: pullRequests.mergeCommitSha,
      })
      .from(pullRequests)
      .where(eq(pullRequests.id, pullRequestId))
    if (!row) throw new Error('expected pull request row')
    return row
  }

  it('update_pr_size_writes_three_columns', async () => {
    await updatePrSize(db, pullRequestId, { additions: 10, deletions: 5, changedFiles: 3 })

    const row = await readSizeRow()
    expect(row.additions).toBe(10)
    expect(row.deletions).toBe(5)
    expect(row.changedFiles).toBe(3)
  })

  it('update_pr_size_writes_merge_commit_sha_when_provided', async () => {
    await updatePrSize(db, pullRequestId, {
      additions: 1,
      deletions: 2,
      changedFiles: 3,
      mergeCommitSha: 'abc',
    })

    const row = await readSizeRow()
    expect(row.mergeCommitSha).toBe('abc')
  })

  it('update_pr_size_does_not_clear_merge_commit_sha_when_omitted', async () => {
    await db
      .update(pullRequests)
      .set({ mergeCommitSha: 'existing-sha' })
      .where(eq(pullRequests.id, pullRequestId))

    await updatePrSize(db, pullRequestId, { additions: 7, deletions: 8, changedFiles: 9 })

    const row = await readSizeRow()
    expect(row.mergeCommitSha).toBe('existing-sha')
    expect(row.additions).toBe(7)
    expect(row.deletions).toBe(8)
    expect(row.changedFiles).toBe(9)
  })

  it('update_pr_size_overwrites_existing_size_values', async () => {
    await updatePrSize(db, pullRequestId, { additions: 1, deletions: 2, changedFiles: 3 })
    await updatePrSize(db, pullRequestId, { additions: 100, deletions: 200, changedFiles: 50 })

    const row = await readSizeRow()
    expect(row.additions).toBe(100)
    expect(row.deletions).toBe(200)
    expect(row.changedFiles).toBe(50)
  })
})
