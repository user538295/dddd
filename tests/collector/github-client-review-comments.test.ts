import { describe, expect, it, vi } from 'vitest'

import { GitHubClient } from '~/collector/github-client'

function jsonResponse(body: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('github-client review comment listing', () => {
  it('github_client_lists_pr_review_comments', async () => {
    const body = [
      { id: 9001, created_at: '2026-04-01T10:00:00Z' },
      { id: 9002, created_at: '2026-04-01T11:00:00Z' },
    ]
    const fetchImpl = vi.fn(async () => jsonResponse(body))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })

    const out = await client.listPullRequestReviewComments({
      owner: 'o',
      repo: 'r',
      pullNumber: 7,
    })

    expect(out).toEqual([
      { id: 9001, createdAt: new Date('2026-04-01T10:00:00Z') },
      { id: 9002, createdAt: new Date('2026-04-01T11:00:00Z') },
    ])
  })

  it('github_client_paginates_review_comments', async () => {
    const pageOne = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      created_at: '2026-04-01T10:00:00Z',
    }))
    const pageTwo = [{ id: 101, created_at: '2026-04-02T10:00:00Z' }]
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call += 1
      if (call === 1) {
        return jsonResponse(pageOne, {
          headers: {
            Link: '<https://api.github.com/repositories/1/pulls/7/comments?page=2>; rel="next"',
          },
        })
      }
      return jsonResponse(pageTwo)
    })
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })
    const out = await client.listPullRequestReviewComments({
      owner: 'o',
      repo: 'r',
      pullNumber: 7,
    })
    expect(out).toHaveLength(101)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
