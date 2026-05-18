import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  __setGitExecForTests,
  detectMergeStrategy,
  GitOpError,
  type GitExecFn,
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
