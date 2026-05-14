import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '~/db/schema'

/** Migrations are read from `./drizzle` at the process working directory (repo root in dev and tests). */
const migrationsFolder = path.resolve(process.cwd(), 'drizzle')

function resolveDatabaseUrl(explicit?: string): string {
  const url = explicit ?? process.env.DATABASE_URL
  if (!url?.trim()) {
    throw new Error('createDb/runMigrations requires databaseUrl or DATABASE_URL')
  }
  return url.trim()
}

export function createDb(databaseUrl?: string) {
  const url = resolveDatabaseUrl(databaseUrl)
  const client = postgres(url)
  return drizzle(client, { schema })
}

export type AppDb = ReturnType<typeof createDb>

export async function runMigrations(databaseUrl?: string): Promise<void> {
  const url = resolveDatabaseUrl(databaseUrl)
  const migrationClient = postgres(url, { max: 1 })
  const db = drizzle(migrationClient)
  try {
    await migrate(db, { migrationsFolder })
  } finally {
    await migrationClient.end({ timeout: 5 })
  }
}
