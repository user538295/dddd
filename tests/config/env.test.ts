import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfigError, getDashboardDateRanges, getEnv } from '~/config/env'

const validDatabaseUrl = 'postgresql://user:pass@localhost:5432/dddd_test'

describe('getEnv', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('env_defaults_are_loaded', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))

    const env = getEnv({
      DATABASE_URL: validDatabaseUrl,
    })

    expect(env.repoRoot).toBe('/Users/manczg/Documents/work/development')
    expect(env.databaseUrl).toBe(validDatabaseUrl)
    expect(env.teamMappingPath).toBe('./config/team-mapping.json')
    expect(env.githubApiBaseUrl).toBe('https://api.github.com')
    expect(env.defaultRangeWeeks).toBe(8)
    expect(env.githubSyncConcurrency).toBe(2)
    expect(env.githubSyncOwner).toBe('gde-mit')
    expect(env.githubToken).toBeUndefined()
    expect(env.initialSyncFrom.getFullYear()).toBe(2026)
    expect(env.initialSyncFrom.getMonth()).toBe(0)
    expect(env.initialSyncFrom.getDate()).toBe(1)
  })

  it('env_reads_overrides', () => {
    const env = getEnv({
      DATABASE_URL: validDatabaseUrl,
      DASHBOARD_REPO_ROOT: '/custom/root',
      TEAM_MAPPING_PATH: './custom-mapping.json',
      GITHUB_API_BASE_URL: 'https://github.example/api',
      DASHBOARD_DEFAULT_RANGE_WEEKS: '4',
      DASHBOARD_INITIAL_SYNC_FROM: '2025-03-15',
      GITHUB_SYNC_CONCURRENCY: '5',
      GITHUB_SYNC_OWNER: 'MyOrg',
      GITHUB_TOKEN: 'secret',
    })

    expect(env.repoRoot).toBe('/custom/root')
    expect(env.teamMappingPath).toBe('./custom-mapping.json')
    expect(env.githubApiBaseUrl).toBe('https://github.example/api')
    expect(env.defaultRangeWeeks).toBe(4)
    expect(env.initialSyncFrom.getFullYear()).toBe(2025)
    expect(env.initialSyncFrom.getMonth()).toBe(2)
    expect(env.initialSyncFrom.getDate()).toBe(15)
    expect(env.githubSyncConcurrency).toBe(5)
    expect(env.githubSyncOwner).toBe('MyOrg')
    expect(env.githubToken).toBe('secret')
  })

  it('env_rejects_invalid_range', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        DASHBOARD_DEFAULT_RANGE_WEEKS: '0',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        DASHBOARD_DEFAULT_RANGE_WEEKS: '-1',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        DASHBOARD_DEFAULT_RANGE_WEEKS: 'nope',
      }),
    ).toThrow(ConfigError)
  })

  it('env_defaults_initial_sync_from_to_current_year_start', () => {
    vi.setSystemTime(new Date('2026-11-01T08:00:00.000Z'))

    const env = getEnv({
      DATABASE_URL: validDatabaseUrl,
    })

    expect(env.initialSyncFrom.getFullYear()).toBe(2026)
    expect(env.initialSyncFrom.getMonth()).toBe(0)
    expect(env.initialSyncFrom.getDate()).toBe(1)
  })

  it('env_rejects_invalid_initial_sync_from', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        DASHBOARD_INITIAL_SYNC_FROM: 'not-a-date',
      }),
    ).toThrow(ConfigError)
  })

  it('env_rejects_invalid_github_sync_concurrency', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        GITHUB_SYNC_CONCURRENCY: '0',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        GITHUB_SYNC_CONCURRENCY: '-2',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        GITHUB_SYNC_CONCURRENCY: 'bad',
      }),
    ).toThrow(ConfigError)
  })

  it('env_rejects_empty_github_sync_owner', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        GITHUB_SYNC_OWNER: '',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        GITHUB_SYNC_OWNER: '   ',
      }),
    ).toThrow(ConfigError)
  })

  it('env_rejects_missing_database_url', () => {
    expect(() => getEnv({})).toThrow(ConfigError)
  })

  it('env_rejects_invalid_database_url', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: 'mysql://localhost:3306/db',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow(ConfigError)

    expect(() =>
      getEnv({
        DATABASE_URL: 'postgresql:///dbname',
      }),
    ).toThrow(ConfigError)
  })

  it('env_accepts_postgres_uri_scheme', () => {
    const env = getEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    })
    expect(env.databaseUrl).toBe('postgres://user:pass@localhost:5432/db')
  })

  it('env_rejects_impossible_calendar_initial_sync_from', () => {
    expect(() =>
      getEnv({
        DATABASE_URL: validDatabaseUrl,
        DASHBOARD_INITIAL_SYNC_FROM: '2025-02-30',
      }),
    ).toThrow(ConfigError)
  })

  it('env_accepts_iso_datetime_initial_sync_from', () => {
    const env = getEnv({
      DATABASE_URL: validDatabaseUrl,
      DASHBOARD_INITIAL_SYNC_FROM: '2025-06-10T12:00:00.000Z',
    })
    expect(Number.isFinite(env.initialSyncFrom.getTime())).toBe(true)
  })
})

describe('getDashboardDateRanges', () => {
  it('rejects_non_positive_weeks', () => {
    expect(() => getDashboardDateRanges(new Date(), 0)).toThrow(ConfigError)
    expect(() => getDashboardDateRanges(new Date(), -1)).toThrow(ConfigError)
    expect(() => getDashboardDateRanges(new Date(), 1.5)).toThrow(ConfigError)
  })

  it('derives_current_and_previous_windows_from_local_calendar', () => {
    const now = new Date('2026-05-14T15:30:00.000')
    const weeks = 8
    const { current, previous } = getDashboardDateRanges(now, weeks)

    expect(current.weeks).toBe(weeks)
    expect(previous.weeks).toBe(weeks)

    expect(current.from.getHours()).toBe(0)
    expect(current.from.getMinutes()).toBe(0)
    expect(current.from.getSeconds()).toBe(0)
    expect(current.from.getMilliseconds()).toBe(0)

    expect(current.to.getHours()).toBe(23)
    expect(current.to.getMinutes()).toBe(59)
    expect(current.to.getSeconds()).toBe(59)
    expect(current.to.getMilliseconds()).toBe(999)

    const dayBeforeCurrentFrom = new Date(current.from)
    dayBeforeCurrentFrom.setDate(dayBeforeCurrentFrom.getDate() - 1)
    dayBeforeCurrentFrom.setHours(23, 59, 59, 999)

    expect(previous.to.getTime()).toBe(dayBeforeCurrentFrom.getTime())

    expect(previous.from.getHours()).toBe(0)
    expect(previous.from.getMinutes()).toBe(0)
    expect(previous.from.getSeconds()).toBe(0)
    expect(previous.from.getMilliseconds()).toBe(0)

    expect(previous.from.getTime()).toBeLessThan(current.from.getTime())
    expect(current.from.getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it('previous_range_ends_immediately_before_current_from_for_merged_at_filter', () => {
    const now = new Date('2026-05-14T12:00:00.000')
    const { current, previous } = getDashboardDateRanges(now, 8)

    const prMergedLastMomentOfPrevious = new Date(previous.to)
    expect(prMergedLastMomentOfPrevious.getTime()).toBeLessThan(current.from.getTime())

    const prMergedAtCurrentFrom = new Date(current.from)
    expect(prMergedAtCurrentFrom.getTime()).toBeGreaterThan(previous.to.getTime())
  })
})
