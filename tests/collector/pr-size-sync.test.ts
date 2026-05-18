import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  __setGitExecForTests,
  detectMergeStrategy,
  GitOpError,
  type GitExecFn,
  runGitDiffShortstat,
} from '~/collector/pr-size-sync'

function createGitMock(
  handler: (gitArgs: readonly string[]) => string,
): GitExecFn {
  return async (_repoPath, gitArgs) => handler(gitArgs)
}

describe('detectMergeStrategy', () => {
  const repoPath = '/tmp/repo'
  const sha = 'abc123def456'

  beforeEach(() => {
    __setGitExecForTests(null)
  })

  afterEach(() => {
    __setGitExecForTests(null)
  })

  it('detect_strategy_two_parents_returns_merge', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'rev-list') {
          return `${sha} parent1 parent2\n`
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(detectMergeStrategy(sha, repoPath, 42)).resolves.toBe('merge')
  })

  it('detect_strategy_squash_message_suffix_returns_squash', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'rev-list') {
          return `${sha} parent1\n`
        }
        if (gitArgs[0] === 'log') {
          return 'feat: ship widget (#42)\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(detectMergeStrategy(sha, repoPath, 42)).resolves.toBe('squash')
  })

  it('detect_strategy_no_suffix_returns_rebase', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'rev-list') {
          return `${sha} parent1\n`
        }
        if (gitArgs[0] === 'log') {
          return 'feat: add thing\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(detectMergeStrategy(sha, repoPath, 42)).resolves.toBe('rebase')
  })

  it('detect_strategy_squash_requires_end_not_substring', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'rev-list') {
          return `${sha} parent1\n`
        }
        if (gitArgs[0] === 'log') {
          return 'feat: (#42) in subject but not at end\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(detectMergeStrategy(sha, repoPath, 42)).resolves.toBe('rebase')
  })

  it('detect_strategy_zero_parents_throws_git_op_error', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'rev-list') {
          return `${sha}\n`
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(detectMergeStrategy(sha, repoPath, 42)).rejects.toBeInstanceOf(GitOpError)
  })
})

describe('runGitDiffShortstat', () => {
  const repoPath = '/tmp/repo'
  const sha = 'abc123def456'

  beforeEach(() => {
    __setGitExecForTests(null)
  })

  afterEach(() => {
    __setGitExecForTests(null)
  })

  it('git_diff_shortstat_parses_full_output', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return ' 3 files changed, 10 insertions(+), 5 deletions(-)\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 10,
      deletions: 5,
      changedFiles: 3,
    })
  })

  it('git_diff_shortstat_parses_insertions_only', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return ' 2 files changed, 4 insertions(+)\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 4,
      deletions: 0,
      changedFiles: 2,
    })
  })

  it('git_diff_shortstat_parses_deletions_only', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return ' 1 file changed, 3 deletions(-)\n'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 0,
      deletions: 3,
      changedFiles: 1,
    })
  })

  it('git_diff_shortstat_empty_output_returns_zeros', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return ''
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    })
  })

  it('git_diff_shortstat_deletions_only_returns_additions_zero', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return '1 file changed, 3 deletions(-)'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 0,
      deletions: 3,
      changedFiles: 1,
    })
  })

  it('git_diff_shortstat_insertions_only_returns_deletions_zero', async () => {
    __setGitExecForTests(
      createGitMock((gitArgs) => {
        if (gitArgs[0] === 'diff') {
          return '2 files changed, 4 insertions(+)'
        }
        throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
      }),
    )

    await expect(runGitDiffShortstat(sha, repoPath)).resolves.toEqual({
      additions: 4,
      deletions: 0,
      changedFiles: 2,
    })
  })

  it('git_diff_shortstat_throws_on_non_zero_exit', async () => {
    __setGitExecForTests(async (_repoPath, gitArgs) => {
      if (gitArgs[0] === 'diff') {
        throw new GitOpError('git diff failed: Command failed: exit code 128')
      }
      throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
    })

    await expect(runGitDiffShortstat(sha, repoPath)).rejects.toBeInstanceOf(GitOpError)
  })

  it('git_diff_shortstat_throws_on_timeout', async () => {
    __setGitExecForTests(async (_repoPath, gitArgs, timeoutMs) => {
      if (gitArgs[0] === 'diff') {
        expect(timeoutMs).toBe(30_000)
        throw new GitOpError('git diff failed: Command timed out')
      }
      throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
    })

    await expect(runGitDiffShortstat(sha, repoPath)).rejects.toBeInstanceOf(GitOpError)
  })

  it('git_diff_shortstat_throws_on_root_commit_no_parent', async () => {
    __setGitExecForTests(async (_repoPath, gitArgs) => {
      if (gitArgs[0] === 'diff') {
        throw new GitOpError(`git diff failed: fatal: Invalid revision ${sha}^1`)
      }
      throw new Error(`unexpected git command: ${gitArgs.join(' ')}`)
    })

    await expect(runGitDiffShortstat(sha, repoPath)).rejects.toMatchObject({
      name: 'GitOpError',
      message: expect.stringContaining('root commit'),
    })
  })
})
