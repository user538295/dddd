import { and, eq, notInArray } from 'drizzle-orm'

import type { TeamMappingConfig } from '~/config/team-mapping'
import { resolveTeamForRepo, shouldSyncRepo } from '~/config/team-mapping'
import type { RepositoryCandidate } from '~/collector/repo-discovery'
import type { AppDb } from '~/db/client'
import { pullRequests, repositories } from '~/db/schema'

export type RepositorySyncSummary = {
  scanned: number
  ready: number
  metadataIncomplete: number
  excluded: number
  missing: number
  remoteIdentityChanges: number
}

function remoteIdentityFrom(owner: string | null, repo: string | null): string | null {
  if (owner && repo) {
    return `${owner}/${repo}`
  }
  return null
}

function resolveScanStatus(
  candidate: RepositoryCandidate,
  mapping: TeamMappingConfig,
  githubSyncOwner: string,
): 'ready' | 'metadata_incomplete' | 'excluded' {
  if (!candidate.owner || !candidate.repo) {
    return 'metadata_incomplete'
  }

  if (candidate.owner.toLowerCase() !== githubSyncOwner.toLowerCase()) {
    return 'excluded'
  }

  const repoName = candidate.repo ?? candidate.name
  if (!shouldSyncRepo(repoName, mapping)) {
    return 'excluded'
  }

  return 'ready'
}

/**
 * Persists discovered repositories: upserts by `path`, assigns team and scan
 * status, marks stale paths under `rootPath` as missing, and clears PR rows
 * when `remoteIdentity` changes for an existing repository.
 */
export async function upsertRepositories(
  db: AppDb,
  rootPath: string,
  candidates: RepositoryCandidate[],
  mapping: TeamMappingConfig,
  githubSyncOwner: string,
): Promise<RepositorySyncSummary> {
  const scanTime = new Date()
  const scannedPaths = candidates.map((c) => c.path)

  let ready = 0
  let metadataIncomplete = 0
  let excluded = 0
  let remoteIdentityChanges = 0
  let missing = 0

  await db.transaction(async (tx) => {
    for (const candidate of candidates) {
      const repoName = candidate.repo ?? candidate.name
      const team = resolveTeamForRepo(repoName, mapping)
      const newRemoteIdentity = remoteIdentityFrom(candidate.owner, candidate.repo)
      const scanStatus = resolveScanStatus(candidate, mapping, githubSyncOwner)

      if (scanStatus === 'ready') {
        ready++
      } else if (scanStatus === 'metadata_incomplete') {
        metadataIncomplete++
      } else {
        excluded++
      }

      const [existing] = await tx
        .select()
        .from(repositories)
        .where(eq(repositories.path, candidate.path))
        .limit(1)

      let identityChanged = false
      if (existing) {
        const prev = existing.remoteIdentity ?? null
        const next = newRemoteIdentity ?? null
        if (prev !== null && prev !== next) {
          identityChanged = true
          remoteIdentityChanges++
          await tx.delete(pullRequests).where(eq(pullRequests.repositoryId, existing.id))
        }
      }

      const row = {
        name: candidate.name,
        path: candidate.path,
        rootPath,
        remoteUrl: candidate.remoteUrl,
        owner: candidate.owner,
        repo: candidate.repo,
        remoteIdentity: newRemoteIdentity,
        team,
        scanStatus,
        active: true,
        lastScannedAt: scanTime,
        updatedAt: scanTime,
        ...(identityChanged ? { lastPrSyncedAt: null as Date | null } : {}),
      }

      if (existing) {
        await tx.update(repositories).set(row).where(eq(repositories.path, candidate.path))
      } else {
        await tx.insert(repositories).values({
          ...row,
          lastPrSyncedAt: null,
        })
      }
    }

    const missingPredicate =
      scannedPaths.length === 0
        ? eq(repositories.rootPath, rootPath)
        : and(eq(repositories.rootPath, rootPath), notInArray(repositories.path, scannedPaths))

    await tx
      .update(repositories)
      .set({
        scanStatus: 'missing',
        active: false,
        lastScannedAt: scanTime,
        updatedAt: scanTime,
      })
      .where(missingPredicate)

    const missingRows = await tx
      .select({ id: repositories.id })
      .from(repositories)
      .where(and(eq(repositories.rootPath, rootPath), eq(repositories.scanStatus, 'missing')))
    missing = missingRows.length
  })

  return {
    scanned: candidates.length,
    ready,
    metadataIncomplete,
    excluded,
    missing,
    remoteIdentityChanges,
  }
}
