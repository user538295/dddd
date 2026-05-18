import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCb)

export class GitOpError extends Error {
  override readonly name = 'GitOpError'

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
  }
}

export type GitExecFn = (
  repoPath: string,
  gitArgs: readonly string[],
  timeoutMs: number,
) => Promise<string>

let gitExecOverride: GitExecFn | null = null

/** @internal Test hook — do not use in production code. */
export function __setGitExecForTests(fn: GitExecFn | null): void {
  gitExecOverride = fn
}

async function runGit(repoPath: string, gitArgs: readonly string[], timeoutMs: number): Promise<string> {
  if (gitExecOverride) {
    return gitExecOverride(repoPath, gitArgs, timeoutMs)
  }

  try {
    const { stdout } = await execFile('git', ['-C', repoPath, ...gitArgs], {
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C' },
      timeout: timeoutMs,
    })
    return stdout
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new GitOpError(`git ${gitArgs[0] ?? 'command'} failed: ${message}`, { cause: error })
  }
}

export async function detectMergeStrategy(
  sha: string,
  repoPath: string,
  prNumber: number,
): Promise<'merge' | 'squash' | 'rebase'> {
  const revListOut = await runGit(repoPath, ['rev-list', '--parents', '-1', sha], 10_000)
  const tokens = revListOut.trim().split(/\s+/).filter((token) => token.length > 0)
  const parentCount = Math.max(0, tokens.length - 1)

  if (parentCount >= 2) {
    return 'merge'
  }

  if (parentCount === 0) {
    throw new GitOpError(`commit ${sha} has no parents (root or orphan)`)
  }

  const subjectOut = await runGit(repoPath, ['log', '-1', '--format=%s', sha], 10_000)
  const firstLine = subjectOut.trim().split('\n')[0] ?? ''
  const squashSuffix = `(#${prNumber})`

  if (firstLine.endsWith(squashSuffix)) {
    return 'squash'
  }

  return 'rebase'
}

function parseGitDiffShortstat(output: string): {
  additions: number
  deletions: number
  changedFiles: number
} {
  const trimmed = output.trim()
  if (trimmed === '') {
    return { additions: 0, deletions: 0, changedFiles: 0 }
  }

  const filesMatch = trimmed.match(/(\d+) files? changed/)
  const insertionsMatch = trimmed.match(/(\d+) insertions?\(\+\)/)
  const deletionsMatch = trimmed.match(/(\d+) deletions?\(-\)/)

  return {
    changedFiles: filesMatch ? Number(filesMatch[1]) : 0,
    additions: insertionsMatch ? Number(insertionsMatch[1]) : 0,
    deletions: deletionsMatch ? Number(deletionsMatch[1]) : 0,
  }
}

export async function runGitDiffShortstat(
  sha: string,
  repoPath: string,
): Promise<{ additions: number; deletions: number; changedFiles: number }> {
  try {
    const output = await runGit(repoPath, ['diff', `${sha}^1`, sha, '--shortstat'], 30_000)
    return parseGitDiffShortstat(output)
  } catch (error) {
    if (error instanceof GitOpError) {
      const message = error.message
      if (
        message.includes('Invalid revision') ||
        message.includes('unknown revision') ||
        message.includes('bad revision')
      ) {
        throw new GitOpError(`git diff failed: root commit or missing parent for ${sha}`, {
          cause: error,
        })
      }
    }
    throw error
  }
}

export async function fetchRepo(
  repoPath: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await runGit(repoPath, ['fetch', '--quiet'], 120_000)
    return { ok: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { ok: false, reason }
  }
}

const DEFAULT_BRANCH_REFS = ['origin/HEAD', 'origin/main', 'origin/master'] as const

type MergeBaseAncestorResult = 'ancestor' | 'not-ancestor' | 'unavailable'

function gitExitCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'number') {
      return code
    }
  }
  return undefined
}

async function tryMergeBaseIsAncestor(
  sha: string,
  repoPath: string,
  ref: string,
): Promise<MergeBaseAncestorResult> {
  const gitArgs = ['merge-base', '--is-ancestor', sha, ref] as const
  const timeoutMs = 10_000

  try {
    if (gitExecOverride) {
      await gitExecOverride(repoPath, gitArgs, timeoutMs)
    } else {
      await execFile('git', ['-C', repoPath, ...gitArgs], {
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C' },
        timeout: timeoutMs,
      })
    }
    return 'ancestor'
  } catch (error) {
    if (gitExitCode(error) === 1) {
      return 'not-ancestor'
    }
    return 'unavailable'
  }
}

export async function isAncestorOfDefaultBranch(
  sha: string,
  repoPath: string,
): Promise<{ ancestor: boolean; warning?: string }> {
  for (const ref of DEFAULT_BRANCH_REFS) {
    const result = await tryMergeBaseIsAncestor(sha, repoPath, ref)
    if (result === 'ancestor') {
      return { ancestor: true }
    }
    if (result === 'not-ancestor') {
      return { ancestor: false }
    }
  }

  return { ancestor: false, warning: 'could not verify ancestry; SHA skipped' }
}
