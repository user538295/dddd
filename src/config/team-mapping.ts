import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_TEAM_MAPPING_PATH = './config/team-mapping.json'

export type TeamMappingTeam = {
  name: string
  repoPatterns: string[]
}

export type TeamMappingConfig = {
  teams: TeamMappingTeam[]
  defaultTeam?: string
  includeRepoPatterns?: string[]
  excludeRepoPatterns?: string[]
}

export class TeamMappingError extends Error {
  override name = 'TeamMappingError'

  constructor(message: string) {
    super(message)
  }
}

function validateRepoPattern(pattern: string, options: { allowBareStar?: boolean }): void {
  if (pattern === '') {
    throw new TeamMappingError('Repository pattern must not be empty')
  }

  if (pattern === '*') {
    if (options.allowBareStar) {
      return
    }
    throw new TeamMappingError('Bare "*" is only allowed in includeRepoPatterns')
  }

  const starCount = [...pattern].filter((c) => c === '*').length
  if (starCount === 0) {
    return
  }
  if (starCount > 1) {
    throw new TeamMappingError('Repository pattern may contain at most one "*"')
  }

  if (!pattern.startsWith('*') && !pattern.endsWith('*')) {
    throw new TeamMappingError('Wildcard "*" must be only a leading or trailing segment')
  }
}

export function repoNameMatchesPattern(
  repoName: string,
  pattern: string,
  options: { allowBareStar?: boolean } = {},
): boolean {
  if (pattern === '*' && options.allowBareStar) {
    return true
  }
  if (!pattern.includes('*')) {
    return repoName === pattern
  }
  if (pattern.startsWith('*')) {
    const suffix = pattern.slice(1)
    return suffix !== '' && repoName.endsWith(suffix)
  }
  const prefix = pattern.slice(0, -1)
  return prefix !== '' && repoName.startsWith(prefix)
}

function matchesAnyPattern(
  repoName: string,
  patterns: string[] | undefined,
  options: { allowBareStar?: boolean },
): boolean {
  if (patterns === undefined) {
    return false
  }
  return patterns.some((p) => repoNameMatchesPattern(repoName, p, options))
}

export function resolveTeamForRepo(repoName: string, config: TeamMappingConfig): string {
  for (const team of config.teams) {
    for (const pattern of team.repoPatterns) {
      if (repoNameMatchesPattern(repoName, pattern, {})) {
        return team.name
      }
    }
  }

  const fallback = config.defaultTeam?.trim()
  if (fallback) {
    return fallback
  }
  return 'Unassigned'
}

export function shouldSyncRepo(repoName: string, config: TeamMappingConfig): boolean {
  if (matchesAnyPattern(repoName, config.excludeRepoPatterns, {})) {
    return false
  }

  if (config.includeRepoPatterns === undefined) {
    return true
  }

  return matchesAnyPattern(repoName, config.includeRepoPatterns, { allowBareStar: true })
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TeamMappingError(`${label} must be a non-empty string`)
  }
}

export async function loadTeamMapping(
  mappingPath: string = DEFAULT_TEAM_MAPPING_PATH,
): Promise<TeamMappingConfig> {
  const resolved = path.isAbsolute(mappingPath)
    ? mappingPath
    : path.resolve(process.cwd(), mappingPath)

  let raw: string
  try {
    raw = await fs.readFile(resolved, 'utf8')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new TeamMappingError(`Failed to read team mapping file ${resolved}: ${msg}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new TeamMappingError('Team mapping file must contain valid JSON')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TeamMappingError('Team mapping root must be a JSON object')
  }

  const root = parsed as Record<string, unknown>

  if (!Array.isArray(root.teams) || root.teams.length === 0) {
    throw new TeamMappingError('teams must be a non-empty array')
  }

  const teams: TeamMappingTeam[] = []

  for (const entry of root.teams) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TeamMappingError('Each team entry must be an object')
    }
    const t = entry as Record<string, unknown>
    assertNonEmptyString(t.name, 'Team name')
    if (!Array.isArray(t.repoPatterns)) {
      throw new TeamMappingError('Each team must define repoPatterns as an array')
    }
    const repoPatterns: string[] = []
    for (const p of t.repoPatterns) {
      if (typeof p !== 'string') {
        throw new TeamMappingError('Each repo pattern must be a string')
      }
      validateRepoPattern(p, {})
      repoPatterns.push(p)
    }
    teams.push({ name: t.name.trim(), repoPatterns })
  }

  let includeRepoPatterns: string[] | undefined
  if (root.includeRepoPatterns !== undefined) {
    if (!Array.isArray(root.includeRepoPatterns)) {
      throw new TeamMappingError('includeRepoPatterns must be an array when provided')
    }
    includeRepoPatterns = []
    for (const p of root.includeRepoPatterns) {
      if (typeof p !== 'string') {
        throw new TeamMappingError('Each includeRepoPatterns entry must be a string')
      }
      validateRepoPattern(p, { allowBareStar: true })
      includeRepoPatterns.push(p)
    }
  }

  let excludeRepoPatterns: string[] | undefined
  if (root.excludeRepoPatterns !== undefined) {
    if (!Array.isArray(root.excludeRepoPatterns)) {
      throw new TeamMappingError('excludeRepoPatterns must be an array when provided')
    }
    excludeRepoPatterns = []
    for (const p of root.excludeRepoPatterns) {
      if (typeof p !== 'string') {
        throw new TeamMappingError('Each excludeRepoPatterns entry must be a string')
      }
      validateRepoPattern(p, {})
      excludeRepoPatterns.push(p)
    }
  }

  let defaultTeam: string | undefined
  if (root.defaultTeam !== undefined) {
    if (typeof root.defaultTeam !== 'string') {
      throw new TeamMappingError('defaultTeam must be a string when provided')
    }
    defaultTeam = root.defaultTeam.trim() === '' ? undefined : root.defaultTeam.trim()
  }

  const config: TeamMappingConfig = { teams }
  if (defaultTeam !== undefined) {
    config.defaultTeam = defaultTeam
  }
  if (includeRepoPatterns !== undefined) {
    config.includeRepoPatterns = includeRepoPatterns
  }
  if (excludeRepoPatterns !== undefined) {
    config.excludeRepoPatterns = excludeRepoPatterns
  }

  return config
}
