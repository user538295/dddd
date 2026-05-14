import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { getGitOriginUrlMock } = vi.hoisted(() => ({
  getGitOriginUrlMock: vi.fn(),
}))

vi.mock('~/collector/git-remote-url', () => ({
  getGitOriginUrl: getGitOriginUrlMock,
}))

import { discoverRepositories } from '~/collector/repo-discovery'

async function createTempRoot(): Promise<string> {
  await mkdir(join(process.cwd(), '.tmp'), { recursive: true })
  return mkdtemp(join(process.cwd(), '.tmp', 'repo-discovery-'))
}

describe('discoverRepositories', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('repo_discovery_finds_git_repositories', async () => {
    const root = await createTempRoot()
    try {
      await mkdir(join(root, 'alpha', '.git'), { recursive: true })
      await mkdir(join(root, 'beta', '.git'), { recursive: true })
      getGitOriginUrlMock.mockResolvedValue('https://github.com/org/repo.git')

      const found = await discoverRepositories(root)
      const names = found.map((c) => c.name).sort()
      expect(names).toEqual(['alpha', 'beta'])
      expect(found.every((c) => c.rootPath === root)).toBe(true)
      expect(found.every((c) => c.path.startsWith(root))).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('repo_discovery_ignores_non_repositories', async () => {
    const root = await createTempRoot()
    try {
      await mkdir(join(root, 'not-a-repo', 'subdir'), { recursive: true })
      await writeFile(join(root, 'file.txt'), 'x')

      const found = await discoverRepositories(root)
      expect(found).toEqual([])
      expect(getGitOriginUrlMock).not.toHaveBeenCalled()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('repo_discovery_records_unparseable_remote', async () => {
    const root = await createTempRoot()
    try {
      await mkdir(join(root, 'gitlab-mirror', '.git'), { recursive: true })
      const url = 'https://gitlab.com/group/project.git'
      getGitOriginUrlMock.mockResolvedValue(url)

      const found = await discoverRepositories(root)
      expect(found).toHaveLength(1)
      expect(found[0]).toMatchObject({
        name: 'gitlab-mirror',
        remoteUrl: url,
        owner: null,
        repo: null,
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('repo_discovery_does_not_mutate_repos', async () => {
    const { gitOriginReadArgs } = await vi.importActual<
      typeof import('~/collector/git-remote-url')
    >('~/collector/git-remote-url')
    const args = gitOriginReadArgs('/tmp/example-repo')
    expect(JSON.stringify(args)).not.toMatch(/\bpull\b/)
    expect(JSON.stringify(args)).not.toMatch(/\bfetch\b/)
    expect(args).toContain('get-url')
  })

  it('repo_discovery_null_remote_when_origin_fails', async () => {
    const root = await createTempRoot()
    try {
      await mkdir(join(root, 'broken-remote', '.git'), { recursive: true })
      getGitOriginUrlMock.mockResolvedValue(null)

      const found = await discoverRepositories(root)
      expect(found).toHaveLength(1)
      expect(found[0]).toMatchObject({
        name: 'broken-remote',
        remoteUrl: null,
        owner: null,
        repo: null,
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
