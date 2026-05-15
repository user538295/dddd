export type AppEnv = {
  repoRoot: string
  databaseUrl: string
  teamMappingPath: string
  githubToken?: string
  githubApiBaseUrl: string
  defaultRangeWeeks: number
  initialSyncFrom: Date
  githubSyncConcurrency: number
  githubSyncOwner: string
}

export type DateRange = {
  from: Date
  to: Date
  weeks: number
}

export type DashboardDateRanges = {
  current: DateRange
  previous: DateRange
}

export class ConfigError extends Error {
  override name = 'ConfigError'

  constructor(message: string) {
    super(message)
  }
}

const DEFAULT_REPO_ROOT = '/Users/manczg/Documents/work/development'
const DEFAULT_TEAM_MAPPING_PATH = './config/team-mapping.json'
const DEFAULT_GITHUB_API_BASE_URL = 'https://api.github.com'
const DEFAULT_RANGE_WEEKS = 8
const DEFAULT_GITHUB_SYNC_CONCURRENCY = 2
const DEFAULT_GITHUB_SYNC_OWNER = 'gde-mit'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function readString(source: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = source[key]
  if (raw === undefined) return undefined
  return raw.trim() === '' ? undefined : raw.trim()
}

function parsePositiveIntWithDefault(
  raw: string | undefined,
  label: string,
  defaultValue: number,
): number {
  if (raw === undefined) return defaultValue
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || String(n) !== raw.trim() || n <= 0) {
    throw new ConfigError(`${label} must be a positive integer`)
  }
  return n
}

function validateDatabaseUrl(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new ConfigError('DATABASE_URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new ConfigError(
      'DATABASE_URL is not a valid URL. If the password contains @, :, #, or other reserved characters, percent-encode them (e.g. @ → %40).',
    )
  }

  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase()
  if (scheme !== 'postgresql' && scheme !== 'postgres') {
    if (scheme === 'file' || scheme === 'sqlite') {
      throw new ConfigError(
        'DATABASE_URL points at a local file database. Phase 01 uses PostgreSQL — set DATABASE_URL in .env to the Compose URI from .env.example (run ./scripts/dev-up.sh).',
      )
    }
    throw new ConfigError('DATABASE_URL must use the postgresql:// or postgres:// scheme.')
  }

  if (!parsed.hostname) {
    throw new ConfigError(
      'DATABASE_URL must include a hostname (e.g. 127.0.0.1 or localhost). Forms like postgresql:///dbname (no host) are not supported here.',
    )
  }
}

function parseInitialSyncFrom(raw: string | undefined, now: Date): Date {
  if (raw === undefined) {
    const y = now.getFullYear()
    return new Date(y, 0, 1, 0, 0, 0, 0)
  }

  const trimmed = raw.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dateOnly) {
    const y = Number(dateOnly[1])
    const m = Number(dateOnly[2]) - 1
    const d = Number(dateOnly[3])
    const dt = new Date(y, m, d, 0, 0, 0, 0)
    if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) {
      throw new ConfigError('DASHBOARD_INITIAL_SYNC_FROM must be a valid ISO date')
    }
    return dt
  }

  const ms = Date.parse(trimmed)
  if (!Number.isFinite(ms)) {
    throw new ConfigError('DASHBOARD_INITIAL_SYNC_FROM must be a valid ISO date')
  }
  return new Date(ms)
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addCalendarDays(d: Date, deltaDays: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + deltaDays)
  return x
}

export function getDashboardDateRanges(now: Date, weeks: number): DashboardDateRanges {
  if (!Number.isFinite(weeks) || weeks <= 0 || !Number.isInteger(weeks)) {
    throw new ConfigError('weeks must be a positive integer')
  }

  const currentFrom = startOfLocalDay(new Date(now.getTime() - weeks * 7 * MS_PER_DAY))
  const currentTo = endOfLocalDay(now)

  const previousTo = endOfLocalDay(addCalendarDays(startOfLocalDay(currentFrom), -1))
  const previousFrom = startOfLocalDay(addCalendarDays(startOfLocalDay(previousTo), -weeks * 7))

  return {
    current: { from: currentFrom, to: currentTo, weeks },
    previous: { from: previousFrom, to: previousTo, weeks },
  }
}

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const databaseUrlRaw = source.DATABASE_URL
  if (databaseUrlRaw === undefined || databaseUrlRaw.trim() === '') {
    throw new ConfigError('DATABASE_URL is required')
  }
  validateDatabaseUrl(databaseUrlRaw)

  const defaultRangeWeeks = parsePositiveIntWithDefault(
    readString(source, 'DASHBOARD_DEFAULT_RANGE_WEEKS'),
    'DASHBOARD_DEFAULT_RANGE_WEEKS',
    DEFAULT_RANGE_WEEKS,
  )

  const githubSyncConcurrency = parsePositiveIntWithDefault(
    readString(source, 'GITHUB_SYNC_CONCURRENCY'),
    'GITHUB_SYNC_CONCURRENCY',
    DEFAULT_GITHUB_SYNC_CONCURRENCY,
  )

  let githubSyncOwner: string
  if (source.GITHUB_SYNC_OWNER === undefined) {
    githubSyncOwner = DEFAULT_GITHUB_SYNC_OWNER
  } else if (source.GITHUB_SYNC_OWNER.trim() === '') {
    throw new ConfigError('GITHUB_SYNC_OWNER must not be empty')
  } else {
    githubSyncOwner = source.GITHUB_SYNC_OWNER.trim()
  }

  const now = new Date()

  return {
    repoRoot: readString(source, 'DASHBOARD_REPO_ROOT') ?? DEFAULT_REPO_ROOT,
    databaseUrl: databaseUrlRaw.trim(),
    teamMappingPath: readString(source, 'TEAM_MAPPING_PATH') ?? DEFAULT_TEAM_MAPPING_PATH,
    githubToken: readString(source, 'GITHUB_TOKEN'),
    githubApiBaseUrl: readString(source, 'GITHUB_API_BASE_URL') ?? DEFAULT_GITHUB_API_BASE_URL,
    defaultRangeWeeks,
    initialSyncFrom: parseInitialSyncFrom(readString(source, 'DASHBOARD_INITIAL_SYNC_FROM'), now),
    githubSyncConcurrency,
    githubSyncOwner,
  }
}
