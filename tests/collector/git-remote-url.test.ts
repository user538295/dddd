import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { getGitOriginUrl } from '~/collector/git-remote-url'

async function createTempRepo(): Promise<string> {
  await mkdir(join(process.cwd(), '.tmp'), { recursive: true })
  const dir = await mkdtemp(join(process.cwd(), '.tmp', 'git-origin-'))
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' })
  execFileSync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/acme/widget.git'],
    { cwd: dir, stdio: 'ignore' },
  )
  return dir
}

describe('getGitOriginUrl', () => {
  it('returns_trimmed_origin_url', async () => {
    const dir = await createTempRepo()
    try {
      expect(await getGitOriginUrl(dir)).toBe('https://github.com/acme/widget.git')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns_null_when_not_a_git_repo', async () => {
    await mkdir(join(process.cwd(), '.tmp'), { recursive: true })
    const dir = await mkdtemp(join(process.cwd(), '.tmp', 'not-git-'))
    try {
      await mkdir(join(dir, 'empty'), { recursive: true })
      expect(await getGitOriginUrl(join(dir, 'empty'))).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
