import type { TeamFirstReviewAgg } from '~/metrics/first-review-exceptions'

export type FirstReviewTeamRow = {
  team: string
  medianHours: number | null
  trendPercent: number | null
  noReviewMergeCount: number | null
}

export function getFirstReviewTeamBreakdown(input: {
  teams: TeamFirstReviewAgg[]
}): FirstReviewTeamRow[] {
  return input.teams.map((t) => ({
    team: t.team,
    medianHours: t.medianHours,
    trendPercent: t.trendPercent,
    noReviewMergeCount: t.noReviewMergeCount,
  }))
}
