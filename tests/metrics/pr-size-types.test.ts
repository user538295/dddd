import { describe, expect, expectTypeOf, it } from 'vitest'

import type { PrSizeRecord } from '~/metrics/pr-size-types'

describe('PrSizeRecord', () => {
  it('pr_size_record_type_compiles', () => {
    const record = {
      id: 'pr-1',
      number: 42,
      title: 'Add feature',
      url: 'https://github.com/org/repo/pull/42',
      repositoryId: 'repo-1',
      repoFullName: 'org/repo',
      team: 'platform',
      mergedAt: new Date('2026-01-15T12:00:00Z'),
      additions: 100,
      deletions: 20,
      changedFiles: 5,
    } satisfies PrSizeRecord

    expectTypeOf(record).toEqualTypeOf<PrSizeRecord>()
    expect(record.number).toBe(42)
  })

  it('pr_size_record_allows_null_size_fields', () => {
    const record = {
      id: 'pr-2',
      number: 7,
      title: 'Unknown size',
      url: 'https://github.com/org/repo/pull/7',
      repositoryId: 'repo-1',
      repoFullName: 'org/repo',
      team: null,
      mergedAt: new Date('2026-02-01T00:00:00Z'),
      additions: null,
      deletions: null,
      changedFiles: null,
    } satisfies PrSizeRecord

    expectTypeOf(record.additions).toEqualTypeOf<number | null>()
    expectTypeOf(record.deletions).toEqualTypeOf<number | null>()
    expectTypeOf(record.changedFiles).toEqualTypeOf<number | null>()
    expect(record.additions).toBeNull()
    expect(record.deletions).toBeNull()
    expect(record.changedFiles).toBeNull()
  })
})
