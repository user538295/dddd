import { describe, expect, it } from 'vitest'
import type { TeamFirstReviewAgg } from '~/metrics/first-review-exceptions'
import { getFirstReviewTeamBreakdown } from '~/metrics/first-review-team-breakdown'

function team(overrides: Partial<TeamFirstReviewAgg>): TeamFirstReviewAgg {
  return {
    team: overrides.team ?? 'T',
    currentQualifyingPrCount: overrides.currentQualifyingPrCount ?? 0,
    previousQualifyingPrCount: overrides.previousQualifyingPrCount ?? 0,
    medianHours: overrides.medianHours ?? null,
    previousMedianHours: overrides.previousMedianHours ?? null,
    trendPercent: overrides.trendPercent ?? null,
    noReviewMergeCount: overrides.noReviewMergeCount ?? null,
  }
}

describe('first-review team breakdown', () => {
  it('first_review_team_column_em_dash_when_no_qualifying_pr', () => {
    const rows = getFirstReviewTeamBreakdown({ teams: [team({ medianHours: null })] })
    expect(rows[0]?.medianHours).toBeNull()
  })

  it('phase_02_team_table_includes_teams_with_only_bot_reviews_with_em_dash', () => {
    const rows = getFirstReviewTeamBreakdown({
      teams: [team({ team: 'BotOnly', medianHours: null, trendPercent: null, noReviewMergeCount: null })],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      team: 'BotOnly',
      medianHours: null,
      trendPercent: null,
      noReviewMergeCount: null,
    })
  })

  it('phase_02_team_table_no_review_merges_renders_em_dash_not_zero_when_no_hygiene_match', () => {
    const rows = getFirstReviewTeamBreakdown({ teams: [team({ noReviewMergeCount: null })] })
    expect(rows[0]?.noReviewMergeCount).toBeNull()
  })

  it('team_with_qualifying_pr_has_median', () => {
    const rows = getFirstReviewTeamBreakdown({
      teams: [team({ medianHours: 4, trendPercent: 10 })],
    })
    expect(rows[0]?.medianHours).toBe(4)
    expect(rows[0]?.trendPercent).toBe(10)
  })
})
