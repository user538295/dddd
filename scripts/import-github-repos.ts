import { importGitHubRepositories, GITHUB_IMPORT_ROOT_PATH, parseRepoSlug } from '../src/collector/github-import'
import { ConfigError, getEnv } from '../src/config/env'

function printUsage(): void {
  console.error(`Fill PostgreSQL with GitHub pull request metadata for explicit repositories.

Usage:
  npm run db:import-github -- owner/repo [owner/repo ...]
  npm run db:import-github -- --repo owner/repo [--repo owner/repo]

Environment (same as the collector):
  DATABASE_URL              — required
  GITHUB_TOKEN              — optional for public repos; recommended
  GITHUB_API_BASE_URL       — optional, default https://api.github.com
  DASHBOARD_INITIAL_SYNC_FROM — optional; first full sync window for new repos
  GITHUB_SYNC_CONCURRENCY   — optional, default 2
  TEAM_MAPPING_PATH         — optional, default ./config/team-mapping.json

Storage:
  Rows use synthetic path "${GITHUB_IMPORT_ROOT_PATH}/<owner>/<repo>" and are not
  updated by "npm run collector:refresh". Re-run this script to refresh PRs.
`)
}

function parseArgs(argv: string[]): string[] {
  const slugs: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!
    if (a === '--repo' || a === '-r') {
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('-')) {
        throw new ConfigError(`Missing repository slug after ${a}`)
      }
      slugs.push(next)
      i += 1
      continue
    }
    if (a.startsWith('-')) {
      throw new ConfigError(`Unknown option: ${a}`)
    }
    slugs.push(a)
  }
  return slugs
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (argv.includes('-h') || argv.includes('--help')) {
    printUsage()
    process.exit(0)
  }

  let slugs: string[]
  try {
    slugs = parseArgs(argv)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(msg)
    printUsage()
    process.exit(1)
  }

  if (slugs.length === 0) {
    printUsage()
    process.exit(1)
  }

  let specs: { owner: string; repo: string }[]
  try {
    specs = slugs.map(parseRepoSlug)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(msg)
    process.exit(1)
  }

  const env = getEnv()
  const summary = await importGitHubRepositories({
    databaseUrl: env.databaseUrl,
    githubToken: env.githubToken,
    githubApiBaseUrl: env.githubApiBaseUrl,
    initialSyncFrom: env.initialSyncFrom,
    githubSyncConcurrency: env.githubSyncConcurrency,
    teamMappingPath: env.teamMappingPath,
    specs,
  })

  console.log(JSON.stringify(summary, null, 2))
  process.exit(summary.errors.length > 0 ? 1 : 0)
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
