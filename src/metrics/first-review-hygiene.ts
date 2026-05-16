import { isMergeWithoutReview } from '~/metrics/first-review-hygiene-predicate'
import type { PrAggregate } from '~/metrics/first-review-time'

export { isMergeWithoutReview }

const SEVEN_MINUTES_MS = 7 * 60 * 1000

export type MergeWithoutReviewHygieneInput = {
  openedAt: Date
  mergedAt: Date
  authorBotFlag: boolean
  anyQualifyingReviewCount: number
  preMergeCommentCount: number
}

export function matchesMergeWithoutReviewHygiene(pr: MergeWithoutReviewHygieneInput): boolean {
  if (!isMergeWithoutReview(pr)) return false
  return pr.mergedAt.getTime() - pr.openedAt.getTime() < SEVEN_MINUTES_MS
}

export function countMergeWithoutReviewByTeam(prs: PrAggregate[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of prs) {
    if (!p.mergeWithoutReviewMatchesHygieneRule) continue
    counts.set(p.team, (counts.get(p.team) ?? 0) + 1)
  }
  return counts
}
