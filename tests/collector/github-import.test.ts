import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { GitHubClient } from '~/collector/github-client'
import {
  GITHUB_IMPORT_ROOT_PATH,
  importGitHubRepositories,
  importRepoStoragePath,
  parseRepoSlug,
} from '~/collector/github-import'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

describe('parseRepoSlug', () => {
  it('parseRepoSlug_accepts_owner_repo', () => {
    expect(parseRepoSlug('  Acme/widget-service  ')).toEqual({
      owner: 'Acme',
      repo: 'widget-service',
    })
  })

  it('parseRepoSlug_rejects_empty', () => {
    expect(() => parseRepoSlug('   ')).toThrow(/must not be empty/)
  })

  it('parseRepoSlug_rejects_missing_slash', () => {
    expect(() => parseRepoSlug('onlyowner')).toThrow(/owner\/repo/)
  })

  it('parseRepoSlug_rejects_trailing_slash_only', () => {
    expect(() => parseRepoSlug('owner/')).toThrow(/owner\/repo/)
  })

  it('parseRepoSlug_rejects_multiple_slashes', () => {
    expect(() => parseRepoSlug('a/b/c')).toThrow(/owner\/repo/)
  })
})

describe('importRepoStoragePath', () => {
  it('importRepoStoragePath_joins_root_owner_repo', () => {
    expect(importRepoStoragePath('Org', 'r')).toBe(`${GITHUB_IMPORT_ROOT_PATH}/Org/r`)
  })
})

const databaseUrl = process.env.DATABASE_URL?.trim()

describe('importGitHubRepositories', () => {
  let db: ReturnType<typeof createDb>
  let listSpy: MockInstance

  beforeAll(async () => {
    await runMigrations(databaseUrl!)
    db = createDb(databaseUrl!)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  beforeEach(() => {
    listSpy = vi.spyOn(GitHubClient.prototype, 'listPullRequests').mockResolvedValue([])
  })

  afterEach(() => {
    listSpy.mockRestore()
  })

  it('importGitHubRepositories_upserts_repos_and_pull_requests', async () => {
    const opened = new Date('2024-01-02T00:00:00.000Z')
    const updated = new Date('2024-01-03T00:00:00.000Z')
    listSpy.mockResolvedValue([
      {
        githubNodeId: 'node-pr-1',
        number: 7,
        title: 'JIRA-1 fix',
        state: 'closed',
        isDraft: false,
        openedAt: opened,
        updatedAt: updated,
        mergedAt: new Date('2024-01-02T12:00:00.000Z'),
        mergeCommitSha: null,
        url: 'https://github.com/gde-mit/sample/pull/7',
      },
    ])

    const summary = await importGitHubRepositories({
      databaseUrl: databaseUrl!,
      githubApiBaseUrl: 'https://api.github.com',
      githubToken: 'test-token',
      initialSyncFrom: new Date('2020-01-01T00:00:00.000Z'),
      githubSyncConcurrency: 2,
      teamMappingPath: './config/team-mapping.example.json',
      specs: [{ owner: 'gde-mit', repo: 'sample' }],
    })

    expect(summary.errors).toHaveLength(0)
    expect(summary.reposTouched).toBe(1)
    expect(summary.prsSeen).toBe(1)

    const [row] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.path, `${GITHUB_IMPORT_ROOT_PATH}/gde-mit/sample`))
      .limit(1)
    expect(row).toBeDefined()
    expect(row!.rootPath).toBe(GITHUB_IMPORT_ROOT_PATH)
    expect(row!.scanStatus).toBe('ready')
    expect(row!.remoteUrl).toBe('https://github.com/gde-mit/sample')

    const prRows = await db.select().from(pullRequests).where(eq(pullRequests.repositoryId, row!.id))
    expect(prRows).toHaveLength(1)
    expect(prRows[0]!.number).toBe(7)
    expect(prRows[0]!.state).toBe('merged')
  })
})
