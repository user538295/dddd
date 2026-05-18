import { describe, expect, it, vi } from 'vitest'

import { GitHubClient } from '~/collector/github-client'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function basePrRaw(overrides: Record<string, unknown> = {}) {
  return {
    node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
    number: 42,
    title: 'Fix thing',
    state: 'closed',
    draft: false,
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-12T15:30:00Z',
    merged_at: '2024-01-12T15:00:00Z',
    html_url: 'https://github.com/o/r/pull/42',
    ...overrides,
  }
}

describe('github-client pr size', () => {
  it('normalize_pr_extracts_merge_commit_sha_when_present', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([basePrRaw({ merge_commit_sha: 'abc123' })]))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })
    const prs = await client.listPullRequests({ owner: 'o', repo: 'r', state: 'all' })
    expect(prs[0]?.mergeCommitSha).toBe('abc123')
  })

  it('normalize_pr_sets_merge_commit_sha_null_when_absent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([basePrRaw()]))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })
    const prs = await client.listPullRequests({ owner: 'o', repo: 'r', state: 'all' })
    expect(prs[0]?.mergeCommitSha).toBeNull()
  })

  it('normalize_pr_sets_merge_commit_sha_null_when_empty_string', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([basePrRaw({ merge_commit_sha: '' })]))
    const client = new GitHubClient({ baseUrl: 'https://api.github.com', fetchImpl })
    const prs = await client.listPullRequests({ owner: 'o', repo: 'r', state: 'all' })
    expect(prs[0]?.mergeCommitSha).toBeNull()
  })
})
