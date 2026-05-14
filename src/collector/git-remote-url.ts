import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCb)

/** Git argv used to read `origin` (Phase 01: no fetch/pull). */
export function gitOriginReadArgs(repoPath: string): readonly string[] {
  return ['-C', repoPath, 'remote', 'get-url', 'origin']
}

export async function getGitOriginUrl(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFile('git', [...gitOriginReadArgs(repoPath)], {
      encoding: 'utf8',
    })
    const trimmed = stdout.trim()
    return trimmed === '' ? null : trimmed
  } catch {
    return null
  }
}
