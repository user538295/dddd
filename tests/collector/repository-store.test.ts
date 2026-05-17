import path from 'node:path'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { RepositoryCandidate } from '~/collector/repo-discovery'
import { upsertRepositories } from '~/collector/repository-store'
import type { TeamMappingConfig } from '~/config/team-mapping'
import { createDb, runMigrations } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

const databaseUrl = process.env.DATABASE_URL?.trim()

function baseCandidate(
  root: string,
  name: string,
  overrides: Partial<RepositoryCandidate> = {},
): RepositoryCandidate {
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

describe('repository-store', () => {
  let db: ReturnType<typeof createDb>

  beforeAll(async () => {
    await runMigrations(databaseUrl)
    db = createDb(databaseUrl)
  })

  afterAll(async () => {
    await db.$client.end({ timeout: 5 })
  })

  it('repository_upsert_is_idempotent', async () => {
    const root = path.join('/tmp', `repo-store-idem-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'repo-a', { repo: 'repo-a' })
    const map = mapping([{ name: 'T', repoPatterns: ['repo-a'] }])

    const s1 = await upsertRepositories(db, root, [cand], map, 'gde-mit')
    const s2 = await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const rows = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(rows).toHaveLength(1)
    expect(s1.scanned).toBe(1)
    expect(s2.scanned).toBe(1)
  })

  it('repository_store_assigns_team', async () => {
    const root = path.join('/tmp', `repo-store-team-${crypto.randomUUID()}`)
    const repo = 'my-service'
    const cand = baseCandidate(root, 'folder', { repo, owner: 'gde-mit' })
    const map = mapping([{ name: 'Platform', repoPatterns: [repo] }])

    await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(row?.team).toBe('Platform')
    expect(row?.scanStatus).toBe('ready')
  })

  it('repository_store_prefers_canonical_github_repo_name_for_team_mapping', async () => {
    const root = path.join('/tmp', `repo-store-canonical-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'wrong-local-name', {
      owner: 'gde-mit',
      repo: 'actual-github-repo',
    })
    const map = mapping([{ name: 'Mapped', repoPatterns: ['actual-github-repo'] }])

    await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(row?.team).toBe('Mapped')
  })

  it('repository_store_marks_metadata_incomplete', async () => {
    const root = path.join('/tmp', `repo-store-meta-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'no-remote', {
      remoteUrl: null,
      owner: null,
      repo: null,
    })
    const map = mapping([{ name: 'T', repoPatterns: ['no-remote'] }])

    await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(row?.scanStatus).toBe('metadata_incomplete')
    expect(row?.remoteIdentity).toBeNull()
  })

  it('repository_store_marks_excluded_repos', async () => {
    const root = path.join('/tmp', `repo-store-exc-${crypto.randomUUID()}`)
    const repo = 'blocked-repo'
    const cand = baseCandidate(root, repo, { owner: 'gde-mit', repo })
    const map = mapping([{ name: 'T', repoPatterns: [repo] }], {
      excludeRepoPatterns: [repo],
    })

    const summary = await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(row?.scanStatus).toBe('excluded')
    expect(summary.excluded).toBe(1)
    expect(summary.ready).toBe(0)
  })

  it('repository_store_marks_wrong_github_owner_excluded', async () => {
    const root = path.join('/tmp', `repo-store-owner-${crypto.randomUUID()}`)
    const cand = baseCandidate(root, 'ext', {
      owner: 'other-org',
      repo: 'r1',
      remoteUrl: 'https://github.com/other-org/r1.git',
    })
    const map = mapping([{ name: 'T', repoPatterns: ['r1'] }])

    await upsertRepositories(db, root, [cand], map, 'gde-mit')

    const [row] = await db.select().from(repositories).where(eq(repositories.path, cand.path))
    expect(row?.scanStatus).toBe('excluded')
  })

  it('repository_store_respects_org_include_and_exclude_together', async () => {
    const root = path.join('/tmp', `repo-store-inc-exc-${crypto.randomUUID()}`)
    const readyRepo = 'good-repo'
    const excludedRepo = 'bad-repo'
    const c1 = baseCandidate(root, readyRepo, { owner: 'gde-mit', repo: readyRepo })
    const c2 = baseCandidate(root, excludedRepo, { owner: 'gde-mit', repo: excludedRepo })
    const map = mapping(
      [
        { name: 'A', repoPatterns: [readyRepo] },
        { name: 'B', repoPatterns: [excludedRepo] },
      ],
      { includeRepoPatterns: [readyRepo, excludedRepo], excludeRepoPatterns: [excludedRepo] },
    )

    const summary = await upsertRepositories(db, root, [c1, c2], map, 'gde-mit')

    const rows = await db.select().from(repositories).where(eq(repositories.rootPath, root))
    const byPath = Object.fromEntries(rows.map((r) => [r.path, r]))

    expect(byPath[c1.path]?.scanStatus).toBe('ready')
    expect(byPath[c2.path]?.scanStatus).toBe('excluded')
    expect(summary.ready).toBe(1)
    expect(summary.excluded).toBe(1)
  })

  it('repository_store_marks_missing_repos_inactive', async () => {
    const root = path.join('/tmp', `repo-store-miss-${crypto.randomUUID()}`)
    const map = mapping([{ name: 'T', repoPatterns: ['a', 'b'] }])
    const a = baseCandidate(root, 'a', { owner: 'gde-mit', repo: 'a' })
    const b = baseCandidate(root, 'b', { owner: 'gde-mit', repo: 'b' })

    await upsertRepositories(db, root, [a, b], map, 'gde-mit')
    await upsertRepositories(db, root, [a], map, 'gde-mit')

    const rows = await db.select().from(repositories).where(eq(repositories.rootPath, root))
    const byPath = Object.fromEntries(rows.map((r) => [r.path, r]))

    expect(byPath[a.path]?.active).toBe(true)
    expect(byPath[b.path]?.active).toBe(false)
    expect(byPath[b.path]?.scanStatus).toBe('missing')
  })

  it('repository_store_only_marks_missing_within_scan_root', async () => {
    const rootA = path.join('/tmp', `repo-store-root-a-${crypto.randomUUID()}`)
    const rootB = path.join('/tmp', `repo-store-root-b-${crypto.randomUUID()}`)
    const map = mapping([{ name: 'T', repoPatterns: ['ra', 'rb'] }])
    const ca = baseCandidate(rootA, 'ca', { owner: 'gde-mit', repo: 'ra' })
    const cb = baseCandidate(rootB, 'cb', { owner: 'gde-mit', repo: 'rb' })

    await upsertRepositories(db, rootA, [ca], map, 'gde-mit')
    await upsertRepositories(db, rootB, [cb], map, 'gde-mit')
    await upsertRepositories(db, rootA, [], map, 'gde-mit')

    const [rowB] = await db.select().from(repositories).where(eq(repositories.path, cb.path))
    expect(rowB?.scanStatus).toBe('ready')
    expect(rowB?.active).toBe(true)
  })

  it('repository_store_reactivates_rediscovered_repo', async () => {
    const root = path.join('/tmp', `repo-store-react-${crypto.randomUUID()}`)
    const map = mapping([{ name: 'T', repoPatterns: ['r'] }])
    const c = baseCandidate(root, 'r', { owner: 'gde-mit', repo: 'r' })

    await upsertRepositories(db, root, [c], map, 'gde-mit')
    await upsertRepositories(db, root, [], map, 'gde-mit')
    let [row] = await db.select().from(repositories).where(eq(repositories.path, c.path))
    expect(row?.scanStatus).toBe('missing')
    expect(row?.active).toBe(false)

    await upsertRepositories(db, root, [c], map, 'gde-mit')
    ;[row] = await db.select().from(repositories).where(eq(repositories.path, c.path))
    expect(row?.scanStatus).toBe('ready')
    expect(row?.active).toBe(true)
  })

  it('repository_store_resets_pr_sync_on_remote_identity_change', async () => {
    const root = path.join('/tmp', `repo-store-rid-${crypto.randomUUID()}`)
    const map = mapping([
      { name: 'T', repoPatterns: ['repo-a', 'repo-b'] },
    ])

    const first = baseCandidate(root, 'workdir', { owner: 'gde-mit', repo: 'repo-a' })
    await upsertRepositories(db, root, [first], map, 'gde-mit')

    const [repoBefore] = await db.select().from(repositories).where(eq(repositories.path, first.path))
    const opened = new Date('2026-01-01T00:00:00.000Z')
    const updated = new Date('2026-01-02T00:00:00.000Z')
    await db.insert(pullRequests).values({
      repositoryId: repoBefore!.id,
      githubNodeId: `node-${crypto.randomUUID()}`,
      number: 1,
      title: 'PR',
      state: 'merged',
      openedAt: opened,
      githubUpdatedAt: updated,
      url: 'https://github.com/gde-mit/repo-a/pull/1',
    })

    const second = baseCandidate(root, 'workdir', {
      owner: 'gde-mit',
      repo: 'repo-b',
      remoteUrl: 'https://github.com/gde-mit/repo-b.git',
    })
    const summary = await upsertRepositories(db, root, [second], map, 'gde-mit')

    const prs = await db.select().from(pullRequests).where(eq(pullRequests.repositoryId, repoBefore!.id))
    expect(prs).toHaveLength(0)
    expect(summary.remoteIdentityChanges).toBe(1)

    const [repoAfter] = await db.select().from(repositories).where(eq(repositories.path, first.path))
    expect(repoAfter?.lastPrSyncedAt).toBeNull()
    expect(repoAfter?.remoteIdentity).toBe('gde-mit/repo-b')
  })
})
