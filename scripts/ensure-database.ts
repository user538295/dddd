import postgres from 'postgres'

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function buildMaintenanceUrl(databaseUrl: string): { adminUrl: string; databaseName: string } {
  const parsed = new URL(databaseUrl)
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name')
  }
  parsed.pathname = '/postgres'
  return { adminUrl: parsed.toString(), databaseName }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const { adminUrl, databaseName } = buildMaintenanceUrl(databaseUrl)
  const sql = postgres(adminUrl, { max: 1 })
  try {
    const rows = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `
    if (rows[0]?.exists) {
      return
    }
    await sql.unsafe(`create database ${quoteIdentifier(databaseName)}`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
