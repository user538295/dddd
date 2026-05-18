import { and, eq } from 'drizzle-orm'

import type { GitHubPullRequest } from '~/collector/github-client'
import type { AppDb } from '~/db/client'
import { pullRequests } from '~/db/schema'

const JIRA_KEY_IN_TITLE = /[A-Z][A-Z0-9]+-\d+/

export type PullRequestSyncSummary = {
  seen: number
  merged: number
  open: number
  missingJiraKey: number
  invalidLifecycle: number
  /** PR numbers skipped due to `mergedAt < openedAt` (for sync error rows). */
  invalidLifecyclePullNumbers: number[]
}

function missingJiraKeyForTitle(title: string): boolean {
  return !JIRA_KEY_IN_TITLE.test(title)
}

function toDbState(pr: GitHubPullRequest): 'open' | 'closed' | 'merged' {
  if (pr.state === 'open') {
    return 'open'
  }
  if (pr.mergedAt !== null) {
    return 'merged'
  }
  return 'closed'
}

/**
 * Upserts GitHub pull request rows for a repository. Skips rows where
 * `mergedAt` is before `openedAt` (counted in `invalidLifecycle` for sync error recording).
 */
export async function upsertPullRequests(
  db: AppDb,
  repositoryId: string,
  prs: GitHubPullRequest[],
): Promise<PullRequestSyncSummary> {
  const summary: PullRequestSyncSummary = {
    seen: 0,
    merged: 0,
    open: 0,
    missingJiraKey: 0,
    invalidLifecycle: 0,
    invalidLifecyclePullNumbers: [],
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    for (const pr of prs) {
      summary.seen += 1

      if (pr.mergedAt !== null && pr.mergedAt.getTime() < pr.openedAt.getTime()) {
        summary.invalidLifecycle += 1
        summary.invalidLifecyclePullNumbers.push(pr.number)
        continue
      }

      const missingJira = missingJiraKeyForTitle(pr.title)
      if (missingJira) {
        summary.missingJiraKey += 1
      }

      const state = toDbState(pr)
      if (state === 'merged') {
        summary.merged += 1
      } else if (state === 'open') {
        summary.open += 1
      }

      const row = {
        repositoryId,
        githubNodeId: pr.githubNodeId,
        number: pr.number,
        title: pr.title,
        state,
        isDraft: pr.isDraft,
        openedAt: pr.openedAt,
        githubUpdatedAt: pr.updatedAt,
        mergedAt: pr.mergedAt,
        mergeCommitSha: pr.mergeCommitSha,
        url: pr.url,
        missingJiraKey: missingJira,
        updatedAt: now,
      }

      const [existing] = await tx
        .select({ id: pullRequests.id })
        .from(pullRequests)
        .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.number, pr.number)))
        .limit(1)

      if (existing) {
        await tx
          .update(pullRequests)
          .set({
            githubNodeId: row.githubNodeId,
            title: row.title,
            state: row.state,
            isDraft: row.isDraft,
            openedAt: row.openedAt,
            githubUpdatedAt: row.githubUpdatedAt,
            mergedAt: row.mergedAt,
            mergeCommitSha: row.mergeCommitSha,
            url: row.url,
            missingJiraKey: row.missingJiraKey,
            updatedAt: row.updatedAt,
          })
          .where(eq(pullRequests.id, existing.id))
      } else {
        await tx.insert(pullRequests).values({
          repositoryId: row.repositoryId,
          githubNodeId: row.githubNodeId,
          number: row.number,
          title: row.title,
          state: row.state,
          isDraft: row.isDraft,
          openedAt: row.openedAt,
          githubUpdatedAt: row.githubUpdatedAt,
          mergedAt: row.mergedAt,
          mergeCommitSha: row.mergeCommitSha,
          url: row.url,
          missingJiraKey: row.missingJiraKey,
          updatedAt: row.updatedAt,
        })
      }
    }
  })

  return summary
}
