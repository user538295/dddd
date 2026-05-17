import type { TeamFirstReviewAgg } from '~/metrics/first-review-exceptions'

export type FirstReviewTeamRow = {
  team: string
  reviewedPrs: number
  medianHours: number | null
  previousMedianHours: number | null
  trendPercent: number | null
  noReviewMergeCount: number | null
}

export function getFirstReviewTeamBreakdown(input: {
  teams: TeamFirstReviewAgg[]
}): FirstReviewTeamRow[] {
  return input.teams.map((t) => ({
    team: t.team,
    reviewedPrs: t.currentQualifyingPrCount,
    medianHours: t.medianHours,
    previousMedianHours: t.previousMedianHours,
    trendPercent: t.trendPercent,
    noReviewMergeCount: t.noReviewMergeCount,
  }))
}
