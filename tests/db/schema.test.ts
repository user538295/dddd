import { getTableName } from 'drizzle-orm'
import { getTableColumns } from 'drizzle-orm/utils'
import { describe, expect, it } from 'vitest'
import { pullRequests, repositories, syncErrors, syncRuns } from '~/db/schema'

describe('db schema', () => {
  it('schema_exports_required_tables', () => {
    expect(repositories).toBeDefined()
    expect(pullRequests).toBeDefined()
    expect(syncRuns).toBeDefined()
    expect(syncErrors).toBeDefined()
  })

  it('schema_defines_unique_repository_path', () => {
    expect(repositories.path.isUnique).toBe(true)
  })

  it('schema_timestamps_use_timestamptz', () => {
    const tables = [repositories, pullRequests, syncRuns, syncErrors] as const
    for (const table of tables) {
      for (const col of Object.values(getTableColumns(table))) {
        if (typeof col.getSQLType !== 'function') continue
        const sqlType = col.getSQLType().toLowerCase()
        if (!sqlType.includes('timestamp')) continue
        expect(sqlType, `${getTableName(col.table)}.${col.name}`).toContain('time zone')
      }
    }
  })
})
