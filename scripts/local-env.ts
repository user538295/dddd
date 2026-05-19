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

export function loadLocalEnv(options: { preferDotenvKeys?: readonly string[] } = {}): void {
  const fromFiles = loadEnv(process.env.NODE_ENV ?? 'development', repoRoot, '')
  const preferDotenv = new Set(options.preferDotenvKeys ?? [])
  delete process.env.NO_COLOR

  for (const key of LOCAL_ENV_KEYS) {
    const fileValue = preferDotenv.has(key) ? readDotenvValue(key) ?? fromFiles[key] : fromFiles[key]
    if (fileValue === undefined) {
      continue
    }
    if (process.env[key] === undefined || preferDotenv.has(key)) {
      process.env[key] = fileValue
    }
  }
}
