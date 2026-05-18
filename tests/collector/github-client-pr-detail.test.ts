import { describe, expect, it, vi } from 'vitest'

import { GitHubClient, GitHubSyncError } from '~/collector/github-client'

function jsonResponse(body: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('github-client pr detail', () => {
  it('get_pr_detail_returns_additions_deletions_changed_files', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        additions: 120,
        deletions: 45,
        changed_files: 8,
      }),
    )
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    const out = await client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 })

    expect(out).toEqual({ additions: 120, deletions: 45, changedFiles: 8 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://api.github.com/repos/o/r/pulls/42')
  })

  it('get_pr_detail_throws_sync_error_on_missing_additions', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        deletions: 45,
        changed_files: 8,
      }),
    )
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toBeInstanceOf(GitHubSyncError)
    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toMatchObject({ code: 'unknown' })
  })

  it('get_pr_detail_throws_sync_error_on_rate_limit', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'rate limit' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toBeInstanceOf(GitHubSyncError)
    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toMatchObject({ code: 'rate_limited' })
  })

  it('get_pr_detail_throws_sync_error_on_unauthorized', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Bad credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toBeInstanceOf(GitHubSyncError)
    await expect(
      client.getPullRequestDetail({ owner: 'o', repo: 'r', pullNumber: 42 }),
    ).rejects.toMatchObject({ code: 'unauthorized' })
  })
})
