/**
 * Parses a Git `origin` URL into GitHub owner and repository name when the
 * remote points at github.com (including common SSH host-alias entries).
 */
export function parseGitHubRemote(
  remoteUrl: string,
): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim()
  if (!trimmed) {
    return null
  }

  const https = trimmed.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i,
  )
  if (https) {
    const owner = https[1]
    const repo = stripTrailingGit(https[2])
    if (!owner || !repo) {
      return null
    }
    return { owner, repo }
  }

  const ssh = trimmed.match(/^git@([^:]+):(.+)$/)
  if (ssh) {
    const host = ssh[1]
    const pathPart = ssh[2]
    if (!/^github\.com(-|$)/i.test(host)) {
      return null
    }
    const path = stripTrailingGit(pathPart)
    const slash = path.indexOf('/')
    if (slash === -1) {
      return null
    }
    const owner = path.slice(0, slash)
    const repo = path.slice(slash + 1)
    if (!owner || !repo || repo.includes('/')) {
      return null
    }
    return { owner, repo }
  }

  return null
}

function stripTrailingGit(segment: string): string {
  return segment.replace(/\.git$/i, '')
}
