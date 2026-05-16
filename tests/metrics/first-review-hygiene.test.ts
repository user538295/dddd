import { describe, expect, it } from 'vitest'
import {
  countMergeWithoutReviewByTeam,
  matchesMergeWithoutReviewHygiene,
} from '~/metrics/first-review-hygiene'
import type { PrAggregate } from '~/metrics/first-review-time'

function makeInput(overrides: Partial<Parameters<typeof matchesMergeWithoutReviewHygiene>[0]> = {}) {
  return {
    openedAt: overrides.openedAt ?? new Date('2026-04-10T11:55:00Z'),
    mergedAt: overrides.mergedAt ?? new Date('2026-04-10T11:59:00Z'),
    authorBotFlag: overrides.authorBotFlag ?? false,
    anyQualifyingReviewCount: overrides.anyQualifyingReviewCount ?? 0,
    preMergeCommentCount: overrides.preMergeCommentCount ?? 0,
  }
}

function agg(team: string, match: boolean): PrAggregate {
  return {
    prId: `pr-${Math.random()}`,
    prNumber: 1,
    title: 't',
    repoId: 'r-1',
    repoFullName: 'o/r',
    team,
    openedAt: new Date('2026-04-10T11:00:00Z'),
    mergedAt: new Date('2026-04-10T12:00:00Z'),
    firstQualifyingHumanReviewAt: null,
    anyQualifyingReviewCount: 0,
    qualifyingHumanReviewCount: 0,
    qualifyingBotReviewCount: 0,
    firstQualifyingReviewIsBot: false,
    preMergeCommentCount: 0,
    mergeWithoutReviewMatchesHygieneRule: match,
  }
}

describe('first-review hygiene rule', () => {
  it('merge_without_review_hygiene_rule', () => {
    expect(matchesMergeWithoutReviewHygiene(makeInput())).toBe(true)
  })

  it('bot_only_pr_not_auto_hygiene', () => {
    expect(matchesMergeWithoutReviewHygiene(makeInput({ anyQualifyingReviewCount: 1 }))).toBe(false)
  })

  it('hygiene_uses_any_qualifying_review_count_not_distinct_authors', () => {
    expect(matchesMergeWithoutReviewHygiene(makeInput({ anyQualifyingReviewCount: 2 }))).toBe(false)
  })

  it('hygiene_seven_minute_threshold_boundary', () => {
    const opened = new Date('2026-04-10T11:00:00Z')
    expect(
      matchesMergeWithoutReviewHygiene(
        makeInput({ openedAt: opened, mergedAt: new Date(opened.getTime() + 7 * 60 * 1000) }),
      ),
    ).toBe(false)
    expect(
      matchesMergeWithoutReviewHygiene(
        makeInput({ openedAt: opened, mergedAt: new Date(opened.getTime() + 6 * 60 * 1000 + 59 * 1000) }),
      ),
    ).toBe(true)
  })

  it('hygiene_requires_zero_pre_merge_comments', () => {
    expect(matchesMergeWithoutReviewHygiene(makeInput({ preMergeCommentCount: 1 }))).toBe(false)
  })

  it('count_merge_without_review_by_team_uses_flag', () => {
    const out = countMergeWithoutReviewByTeam([
      agg('A', true),
      agg('A', true),
      agg('B', false),
      agg('B', true),
    ])
    expect(out.get('A')).toBe(2)
    expect(out.get('B')).toBe(1)
  })
})
