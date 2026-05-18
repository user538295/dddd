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
