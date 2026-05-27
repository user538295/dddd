import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

export const LOCAL_ENV_KEYS = [
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'DASHBOARD_REPO_ROOT',
  'TEAM_MAPPING_PATH',
  'GITHUB_API_BASE_URL',
  'GITHUB_SYNC_OWNER',
  'DASHBOARD_DEFAULT_RANGE_WEEKS',
  'DASHBOARD_INITIAL_SYNC_FROM',
  'GITHUB_SYNC_CONCURRENCY',
] as const

const E2E_REFRESH_STUB_ALLOW_KEY = 'DASHBOARD_ALLOW_E2E_REFRESH_STUB'

export function clearE2eRefreshStubForLocalCommand(env: NodeJS.ProcessEnv = process.env): void {
  delete env.DASHBOARD_E2E_REFRESH_STUB
  delete env[E2E_REFRESH_STUB_ALLOW_KEY]
}

export function clearE2eRefreshStubUnlessAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env[E2E_REFRESH_STUB_ALLOW_KEY]?.trim() === '1') {
    return
  }
  delete env.DASHBOARD_E2E_REFRESH_STUB
}

function readDotenvValue(key: string): string | undefined {
  const envPath = path.join(repoRoot, '.env')
  if (!fs.existsSync(envPath)) {
    return undefined
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`).exec(line)
    if (!match) {
      continue
    }
    let value = match[1] ?? ''
    const hash = value.indexOf(' #')
    if (hash >= 0) {
      value = value.slice(0, hash)
    }
    value = value.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return undefined
}

// Inside the dev container the compose env block sets host-vs-container
// path/URL differences (e.g. DATABASE_URL points at postgres:5432, not
// 127.0.0.1:54332). Preferring `.env` over inherited env for these keys
// would silently break the container if the user left their host-side
// values in `.env`. Detect the container at runtime via the well-known
// runtime marker files (Docker writes /.dockerenv, Podman writes
// /run/.containerenv) and let inherited env win for these keys.
const RUNNING_IN_CONTAINER =
  fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv')
const CONTAINER_INHERIT_KEYS: ReadonlySet<string> = new Set([
  'DATABASE_URL',
  'TEST_DATABASE_URL',
  'DASHBOARD_REPO_ROOT',
])

export function loadLocalEnv(options: { preferDotenvKeys?: readonly string[] } = {}): void {
  const fromFiles = loadEnv(process.env.NODE_ENV ?? 'development', repoRoot, '')
  const preferDotenv = new Set(options.preferDotenvKeys ?? [])
  delete process.env.NO_COLOR

  for (const key of LOCAL_ENV_KEYS) {
    const allowDotenvPrecedence =
      preferDotenv.has(key) && !(RUNNING_IN_CONTAINER && CONTAINER_INHERIT_KEYS.has(key))
    const fileValue = allowDotenvPrecedence ? readDotenvValue(key) ?? fromFiles[key] : fromFiles[key]
    if (fileValue === undefined) {
      continue
    }
    if (process.env[key] === undefined || allowDotenvPrecedence) {
      process.env[key] = fileValue
    }
  }
}
