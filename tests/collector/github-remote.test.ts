import { describe, expect, it } from 'vitest'

import { parseGitHubRemote } from '~/collector/github-remote'

describe('parseGitHubRemote', () => {
  it('parses_standard_ssh_remote', () => {
    expect(parseGitHubRemote('git@github.com:owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('parses_ssh_host_alias_remote', () => {
    expect(
      parseGitHubRemote('git@github.com-gde:nexius-learning/repo.git'),
    ).toEqual({
      owner: 'nexius-learning',
      repo: 'repo',
    })
  })

  it('parses_https_remote', () => {
    expect(parseGitHubRemote('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('returns_null_for_non_github_remote', () => {
    expect(parseGitHubRemote('git@gitlab.com:group/project.git')).toBeNull()
    expect(parseGitHubRemote('https://gitlab.com/group/project.git')).toBeNull()
    expect(parseGitHubRemote('not-a-url')).toBeNull()
    expect(parseGitHubRemote('')).toBeNull()
  })

  it('returns_null_for_malformed_ssh_path', () => {
    expect(parseGitHubRemote('git@github.com:only-segment')).toBeNull()
    expect(parseGitHubRemote('git@github.com:/repo.git')).toBeNull()
    expect(parseGitHubRemote('git@github.com:owner/')).toBeNull()
    expect(parseGitHubRemote('git@github.com:owner/repo/extra.git')).toBeNull()
  })

  it('returns_null_when_https_repo_segment_strips_to_empty', () => {
    expect(parseGitHubRemote('https://github.com/owner/.git')).toBeNull()
  })
})
