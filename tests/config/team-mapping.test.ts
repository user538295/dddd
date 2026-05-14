import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  loadTeamMapping,
  repoNameMatchesPattern,
  resolveTeamForRepo,
  shouldSyncRepo,
  TeamMappingError,
  type TeamMappingConfig,
} from '~/config/team-mapping'

describe('loadTeamMapping', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('team_mapping_wraps_non_error_read_failure', async () => {
    const read = vi.spyOn(fs, 'readFile').mockRejectedValueOnce('plain-string')
    await expect(loadTeamMapping('/any/path/mapping.json')).rejects.toThrow(
      /Failed to read team mapping file.*plain-string/,
    )
    read.mockRestore()
  })

  it('team_mapping_loads_valid_config', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'mapping.json')
    const json = {
      teams: [
        { name: 'Alpha', repoPatterns: ['alpha-core'] },
        { name: 'Beta', repoPatterns: ['*-service'] },
      ],
      defaultTeam: 'Other',
      includeRepoPatterns: ['app-*'],
      excludeRepoPatterns: ['*-archive'],
    }
    await fs.writeFile(filePath, JSON.stringify(json), 'utf8')

    const loaded = await loadTeamMapping(filePath)

    expect(loaded.teams).toHaveLength(2)
    expect(loaded.teams[0]?.name).toBe('Alpha')
    expect(loaded.defaultTeam).toBe('Other')
    expect(loaded.includeRepoPatterns).toEqual(['app-*'])
    expect(loaded.excludeRepoPatterns).toEqual(['*-archive'])
  })

  it('team_mapping_accepts_include_bare_star_pattern', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'incstar.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        includeRepoPatterns: ['*'],
      }),
      'utf8',
    )
    const loaded = await loadTeamMapping(filePath)
    expect(loaded.includeRepoPatterns).toEqual(['*'])
    expect(shouldSyncRepo('any-repo', loaded)).toBe(true)
  })

  it('team_mapping_rejects_invalid_config', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'bad.json')

    await fs.writeFile(filePath, JSON.stringify({ teams: [] }), 'utf8')
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: '', repoPatterns: ['x'] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A' }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_invalid_patterns', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'patterns.json')

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: [''] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['a*b'] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['a**b'] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['pre*fix'] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['ok'] }],
        includeRepoPatterns: ['bad*mid'],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['*'] }],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_include_not_array', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'inc.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        includeRepoPatterns: 'not-array',
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_non_string_include_entry', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'inc2.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        includeRepoPatterns: ['ok', 1],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_exclude_not_array', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'exc.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        excludeRepoPatterns: {},
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_non_string_exclude_entry', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'exc2.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        excludeRepoPatterns: [true],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_invalid_default_team_type', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'def.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        defaultTeam: 99,
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_ignores_whitespace_only_default_team', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'def2.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['only-one'] }],
        defaultTeam: '   ',
      }),
      'utf8',
    )
    const loaded = await loadTeamMapping(filePath)
    expect(loaded.defaultTeam).toBeUndefined()
    expect(resolveTeamForRepo('other', loaded)).toBe('Unassigned')
  })

  it('team_mapping_rejects_invalid_json', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'badjson.json')
    await fs.writeFile(filePath, '{ not json', 'utf8')
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_non_object_root', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'arr.json')
    await fs.writeFile(filePath, JSON.stringify([]), 'utf8')
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)

    await fs.writeFile(filePath, 'null', 'utf8')
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_team_entry_not_object', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'teamarr.json')
    await fs.writeFile(filePath, JSON.stringify({ teams: ['nope'] }), 'utf8')
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_non_string_team_pattern', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'pattype.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({ teams: [{ name: 'A', repoPatterns: [1] }] }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_rejects_bare_star_in_exclude', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'excstar.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({
        teams: [{ name: 'A', repoPatterns: ['x'] }],
        excludeRepoPatterns: ['*'],
      }),
      'utf8',
    )
    await expect(loadTeamMapping(filePath)).rejects.toThrow(TeamMappingError)
  })

  it('team_mapping_reports_missing_file', async () => {
    await expect(loadTeamMapping('/nonexistent/path/team-mapping-xyz.json')).rejects.toThrow(
      TeamMappingError,
    )
  })

  it('team_mapping_loads_via_path_relative_to_cwd', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-mapping-'))
    const filePath = path.join(tmpDir, 'rel.json')
    await fs.writeFile(
      filePath,
      JSON.stringify({ teams: [{ name: 'A', repoPatterns: ['svc'] }] }),
      'utf8',
    )
    const rel = path.relative(process.cwd(), filePath)
    const loaded = await loadTeamMapping(rel)
    expect(loaded.teams[0]?.name).toBe('A')
  })
})

describe('repoNameMatchesPattern', () => {
  it('matches_exact_repo_name', () => {
    expect(repoNameMatchesPattern('billing', 'billing', {})).toBe(true)
    expect(repoNameMatchesPattern('billing', 'other', {})).toBe(false)
  })

  it('matches_trailing_wildcard', () => {
    expect(repoNameMatchesPattern('web-app', 'web-*', {})).toBe(true)
    expect(repoNameMatchesPattern('noweb', 'web-*', {})).toBe(false)
  })

  it('matches_leading_wildcard', () => {
    expect(repoNameMatchesPattern('foo-ui', '*-ui', {})).toBe(true)
    expect(repoNameMatchesPattern('foo', '*-ui', {})).toBe(false)
  })

  it('matches_bare_star_when_allowed', () => {
    expect(repoNameMatchesPattern('any', '*', { allowBareStar: true })).toBe(true)
  })
})

describe('resolveTeamForRepo', () => {
  const config: TeamMappingConfig = {
    teams: [
      { name: 'Exact', repoPatterns: ['billing-api'] },
      { name: 'Wildcard', repoPatterns: ['web-*', '*-ui'] },
    ],
    defaultTeam: 'Unassigned',
  }

  it('resolve_team_exact_match', () => {
    expect(resolveTeamForRepo('billing-api', config)).toBe('Exact')
  })

  it('resolve_team_wildcard_match', () => {
    expect(resolveTeamForRepo('web-checkout', config)).toBe('Wildcard')
    expect(resolveTeamForRepo('design-ui', config)).toBe('Wildcard')
  })

  it('resolve_team_falls_back_to_unassigned', () => {
    expect(resolveTeamForRepo('unknown-repo', config)).toBe('Unassigned')
  })

  it('resolve_team_uses_defaultTeam_when_set', () => {
    const c = {
      teams: [{ name: 'A', repoPatterns: ['only-one'] }],
      defaultTeam: 'Pool',
    }
    expect(resolveTeamForRepo('other', c)).toBe('Pool')
  })
})

describe('shouldSyncRepo', () => {
  const teams = [{ name: 'T', repoPatterns: ['placeholder-repo'] }]

  it('should_sync_repo_defaults_to_include', () => {
    const config = { teams }
    expect(shouldSyncRepo('anything', config)).toBe(true)
  })

  it('should_sync_repo_respects_include_patterns', () => {
    const config = {
      teams,
      includeRepoPatterns: ['app-*', 'core'],
    }
    expect(shouldSyncRepo('app-web', config)).toBe(true)
    expect(shouldSyncRepo('core', config)).toBe(true)
    expect(shouldSyncRepo('lib-foo', config)).toBe(false)
  })

  it('should_sync_repo_respects_exclude_patterns', () => {
    const config = {
      teams,
      excludeRepoPatterns: ['*-archive'],
    }
    expect(shouldSyncRepo('my-archive', config)).toBe(false)
    expect(shouldSyncRepo('my-service', config)).toBe(true)
  })

  it('should_sync_repo_exclude_overrides_include_when_both_match', () => {
    const config = {
      teams,
      includeRepoPatterns: ['*'],
      excludeRepoPatterns: ['*-archive'],
    }
    expect(shouldSyncRepo('legacy-archive', config)).toBe(false)
    expect(shouldSyncRepo('legacy-main', config)).toBe(true)
  })

  it('should_sync_repo_bare_star_in_include_matches_all', () => {
    const config = {
      teams,
      includeRepoPatterns: ['*'],
    }
    expect(shouldSyncRepo('any-name', config)).toBe(true)
  })
})
