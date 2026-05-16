import { describe, expect, it, vi } from 'vitest'

import { GitHubClient, GitHubSyncError } from '~/collector/github-client'

function jsonResponse(body: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('github-client review listing', () => {
  it('github_client_lists_pr_reviews', async () => {
    const body = [
      {
        id: 1001,
        state: 'APPROVED',
        submitted_at: '2026-04-01T10:00:00Z',
        user: { login: 'alice', type: 'User' },
      },
      {
        id: 1002,
        state: 'PENDING',
        submitted_at: null,
        user: { login: 'bob', type: 'User' },
      },
    ]
    const fetchImpl = vi.fn(async () => jsonResponse(body))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    const out = await client.listPullRequestReviews({ owner: 'o', repo: 'r', pullNumber: 7 })

    expect(out).toEqual([
      {
        id: 1001,
        state: 'APPROVED',
        submittedAt: new Date('2026-04-01T10:00:00Z'),
        user: { login: 'alice', type: 'User' },
      },
      {
        id: 1002,
        state: 'PENDING',
        submittedAt: null,
        user: { login: 'bob', type: 'User' },
      },
    ])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('github_client_paginates_reviews', async () => {
    const pageOne = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      state: 'COMMENTED',
      submitted_at: '2026-04-01T10:00:00Z',
      user: { login: 'u', type: 'User' },
    }))
    const pageTwo = [
      {
        id: 101,
        state: 'APPROVED',
        submitted_at: '2026-04-02T10:00:00Z',
        user: { login: 'u', type: 'User' },
      },
    ]
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call += 1
      if (call === 1) {
        return jsonResponse(pageOne, {
          headers: {
            Link: '<https://api.github.com/repositories/1/pulls/7/reviews?page=2>; rel="next"',
          },
        })
      }
      return jsonResponse(pageTwo)
    })
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    const out = await client.listPullRequestReviews({ owner: 'o', repo: 'r', pullNumber: 7 })
    expect(out).toHaveLength(101)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('github_client_review_rate_limit_error', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'x-ratelimit-remaining': '0',
        },
      })
    })
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    await expect(
      client.listPullRequestReviews({ owner: 'o', repo: 'r', pullNumber: 7 }),
    ).rejects.toMatchObject({ code: 'rate_limited' })
    await expect(
      client.listPullRequestReviews({ owner: 'o', repo: 'r', pullNumber: 7 }),
    ).rejects.toBeInstanceOf(GitHubSyncError)
  })

  it('github_client_review_user_null_preserved', async () => {
    const body = [{ id: 1, state: 'COMMENTED', submitted_at: '2026-04-01T10:00:00Z', user: null }]
    const fetchImpl = vi.fn(async () => jsonResponse(body))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    const out = await client.listPullRequestReviews({ owner: 'o', repo: 'r', pullNumber: 7 })
    expect(out[0]?.user).toBeNull()
  })
})
