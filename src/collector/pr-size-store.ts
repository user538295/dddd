import { eq } from 'drizzle-orm'

import type { AppDb } from '~/db/client'
import { pullRequests } from '~/db/schema'

export type PrSizeUpdate = {
  additions: number
  deletions: number
  changedFiles: number
  mergeCommitSha?: string
}

export async function updatePrSize(
  db: AppDb,
  pullRequestId: string,
  size: PrSizeUpdate,
): Promise<void> {
  const set: {
    additions: number
    deletions: number
    changedFiles: number
    updatedAt: Date
    mergeCommitSha?: string
  } = {
    additions: size.additions,
    deletions: size.deletions,
    changedFiles: size.changedFiles,
    updatedAt: new Date(),
  }

  if (size.mergeCommitSha !== undefined) {
    set.mergeCommitSha = size.mergeCommitSha
  }

  await db.update(pullRequests).set(set).where(eq(pullRequests.id, pullRequestId))
}
