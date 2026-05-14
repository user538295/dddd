import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { getGitOriginUrl } from '~/collector/git-remote-url'
import { parseGitHubRemote } from '~/collector/github-remote'

export type RepositoryCandidate = {
  name: string
  path: string
  rootPath: string
  remoteUrl: string | null
  owner: string | null
  repo: string | null
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await access(candidatePath)
    return true
  } catch {
    return false
  }
}

/**
 * Lists Git repositories that are immediate children of `rootPath`, reads each
 * `origin` URL, and attaches parsed GitHub owner/repo when applicable.
 */
export async function discoverRepositories(
  rootPath: string,
): Promise<RepositoryCandidate[]> {
  const entries = await readdir(rootPath, { withFileTypes: true })
  const out: RepositoryCandidate[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const name = entry.name
    const path = join(rootPath, name)
    const gitMarker = join(path, '.git')
    if (!(await pathExists(gitMarker))) {
      continue
    }

    const trimmed = await getGitOriginUrl(path)
    let remoteUrl: string | null = null
    let owner: string | null = null
    let repo: string | null = null

    if (trimmed) {
      remoteUrl = trimmed
      const parsed = parseGitHubRemote(trimmed)
      owner = parsed?.owner ?? null
      repo = parsed?.repo ?? null
    }

    out.push({ name, path, rootPath, remoteUrl, owner, repo })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
