import { describe, expect, it } from 'vitest'
import {
  buildFirstReviewExceptions,
  type TeamFirstReviewAgg,
} from '~/metrics/first-review-exceptions'
import type { PrAggregate } from '~/metrics/first-review-time'

function team(overrides: Partial<TeamFirstReviewAgg>): TeamFirstReviewAgg {
  return {
    team: overrides.team ?? 'T',
    currentQualifyingPrCount: overrides.currentQualifyingPrCount ?? 5,
    previousQualifyingPrCount: overrides.previousQualifyingPrCount ?? 5,
    medianHours: overrides.medianHours ?? 5,
    previousMedianHours: overrides.previousMedianHours ?? 4,
    trendPercent: overrides.trendPercent ?? 25,
    noReviewMergeCount: overrides.noReviewMergeCount ?? null,
  }
}

function pr(overrides: Partial<PrAggregate>): PrAggregate {
  return {
    prId: `pr-${Math.random()}`,
    prNumber: overrides.prNumber ?? 1,
    title: overrides.title ?? 't',
    repoId: 'r-1',
    repoFullName: overrides.repoFullName ?? 'o/r',
    team: overrides.team ?? 'T',
    openedAt: new Date(),
    mergedAt: new Date(),
    firstQualifyingHumanReviewAt: null,
    anyQualifyingReviewCount: 0,
    qualifyingHumanReviewCount: 0,
    qualifyingBotReviewCount: 0,
    firstQualifyingReviewIsBot: false,
    preMergeCommentCount: 0,
    mergeWithoutReviewMatchesHygieneRule: overrides.mergeWithoutReviewMatchesHygieneRule ?? false,
  }
}

describe('first-review exception builder', () => {
  it('review_latency_worsened_fires_at_25pct_threshold', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: 5, previousMedianHours: 4, trendPercent: 25 })],
      prs: [],
    })
    expect(out.some((e) => e.type === 'review_latency_worsened')).toBe(true)
  })

  it('review_latency_worsened_does_not_fire_below_25pct_threshold', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: 4.99, previousMedianHours: 4, trendPercent: 24 })],
      prs: [],
    })
    expect(out.some((e) => e.type === 'review_latency_worsened')).toBe(false)
  })

  it('review_latency_worsened_requires_previous_baseline', () => {
    const out = buildFirstReviewExceptions({
      teams: [
        team({
          medianHours: 10,
          previousMedianHours: 4,
          previousQualifyingPrCount: 2,
          currentQualifyingPrCount: 5,
        }),
      ],
      prs: [],
    })
    expect(out.some((e) => e.type === 'review_latency_worsened')).toBe(false)
    expect(out.some((e) => e.type === 'review_baseline_pending')).toBe(true)
  })

  it('merge_without_review_without_qualifying_reviews', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: null, previousMedianHours: null, trendPercent: null })],
      prs: [pr({ mergeWithoutReviewMatchesHygieneRule: true })],
    })
    expect(out.some((e) => e.type === 'merge_without_review')).toBe(true)
  })

  it('review_baseline_pending_emitted', () => {
    const out = buildFirstReviewExceptions({
      teams: [
        team({
          medianHours: 5,
          previousMedianHours: null,
          previousQualifyingPrCount: 1,
          currentQualifyingPrCount: 2,
          trendPercent: null,
        }),
      ],
      prs: [],
    })
    expect(out.some((e) => e.type === 'review_baseline_pending')).toBe(true)
  })

  it('baseline_pending_team_with_only_bot_reviews_silent', () => {
    const out = buildFirstReviewExceptions({
      teams: [
        team({
          currentQualifyingPrCount: 0,
          previousQualifyingPrCount: 0,
          medianHours: null,
          previousMedianHours: null,
          trendPercent: null,
        }),
      ],
      prs: [],
    })
    expect(out).toHaveLength(0)
  })

  it('exceptions_sort_by_severity_then_magnitude_then_team_name', () => {
    const out = buildFirstReviewExceptions({
      teams: [
        team({ team: 'B', medianHours: 5, previousMedianHours: 4, trendPercent: 25 }),
        team({ team: 'A', medianHours: 6, previousMedianHours: 4, trendPercent: 50 }),
      ],
      prs: [],
    })
    expect(out[0]?.team).toBe('A')
    expect(out[1]?.team).toBe('B')
  })

  it('exceptions_capped_at_three_total_across_types', () => {
    const teams: TeamFirstReviewAgg[] = []
    for (let i = 0; i < 10; i += 1) {
      teams.push(
        team({
          team: `T${i}`,
          medianHours: 10,
          previousMedianHours: 4,
          trendPercent: 100,
        }),
      )
    }
    const out = buildFirstReviewExceptions({ teams, prs: [] })
    expect(out.length).toBeLessThanOrEqual(3)
  })

  it('exception_builder_populates_trend_percent_from_team_aggregate', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: 5, previousMedianHours: 4, trendPercent: 30 })],
      prs: [],
    })
    const e = out.find((x) => x.type === 'review_latency_worsened')
    expect(e?.trendPercent).toBe(30)
  })

  it('merge_without_review_exception_populates_prDetails_with_title_repo_only', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: null, previousMedianHours: null, trendPercent: null })],
      prs: [
        pr({
          mergeWithoutReviewMatchesHygieneRule: true,
          prNumber: 42,
          title: 'fix-bug',
          repoFullName: 'org/repo',
        }),
      ],
    })
    const e = out.find((x) => x.type === 'merge_without_review')
    expect(e?.prDetails).toEqual([{ prNumber: 42, title: 'fix-bug', repo: 'org/repo' }])
  })

  it('non_merge_without_review_exceptions_omit_prDetails', () => {
    const out = buildFirstReviewExceptions({
      teams: [team({ medianHours: 5, previousMedianHours: 4, trendPercent: 25 })],
      prs: [],
    })
    const e = out.find((x) => x.type === 'review_latency_worsened')
    expect(e?.prDetails).toBeUndefined()
  })
})
