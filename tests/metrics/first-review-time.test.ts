import { describe, expect, it } from 'vitest'
import {
  buildPrAggregate,
  getFirstHumanReviewSubmittedAt,
  type PrWithReviews,
  type ReviewRow,
} from '~/metrics/first-review-time'

const MERGED = new Date('2026-04-10T12:00:00Z')

function rev(overrides: Partial<ReviewRow>): ReviewRow {
  return {
    state: overrides.state ?? 'APPROVED',
    submittedAt: overrides.submittedAt === undefined ? new Date('2026-04-08T10:00:00Z') : overrides.submittedAt,
    isBot: overrides.isBot ?? false,
  }
}

function pr(overrides: Partial<PrWithReviews['pr']> = {}): PrWithReviews['pr'] {
  return {
    id: 'pr-1',
    number: 1,
    title: 't',
    repositoryId: 'r-1',
    repoFullName: 'o/r',
    team: 'T',
    openedAt: new Date('2026-04-07T10:00:00Z'),
    mergedAt: MERGED,
    authorBotFlag: false,
    ...overrides,
  }
}

describe('first-review per-PR computation', () => {
  it('first_review_uses_earliest_qualifying_human_review', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [
        rev({ submittedAt: new Date('2026-04-09T08:00:00Z') }),
        rev({ submittedAt: new Date('2026-04-08T09:00:00Z') }),
      ],
      MERGED,
    )
    expect(out?.toISOString()).toBe('2026-04-08T09:00:00.000Z')
  })

  it('human_only_median_excludes_bot_reviews', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [
        rev({ submittedAt: new Date('2026-04-08T08:00:00Z'), isBot: true }),
        rev({ submittedAt: new Date('2026-04-09T08:00:00Z'), isBot: false }),
      ],
      MERGED,
    )
    expect(out?.toISOString()).toBe('2026-04-09T08:00:00.000Z')
  })

  it('bot_first_then_human_uses_human_timestamp', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [
        rev({ submittedAt: new Date('2026-04-08T08:00:00Z'), isBot: true }),
        rev({ submittedAt: new Date('2026-04-09T10:00:00Z'), isBot: false }),
      ],
      MERGED,
    )
    expect(out?.toISOString()).toBe('2026-04-09T10:00:00.000Z')
  })

  it('human_first_then_bot_uses_human_timestamp', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [
        rev({ submittedAt: new Date('2026-04-08T08:00:00Z'), isBot: false }),
        rev({ submittedAt: new Date('2026-04-09T10:00:00Z'), isBot: true }),
      ],
      MERGED,
    )
    expect(out?.toISOString()).toBe('2026-04-08T08:00:00.000Z')
  })

  it('dismissed_and_pending_ignored', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [rev({ state: 'DISMISSED' }), rev({ state: 'PENDING', submittedAt: null })],
      MERGED,
    )
    expect(out).toBeNull()
  })

  it('review_after_merge_ignored', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [rev({ submittedAt: new Date('2026-04-11T10:00:00Z') })],
      MERGED,
    )
    expect(out).toBeNull()
  })

  it('returns_null_when_only_bot_reviews', () => {
    const out = getFirstHumanReviewSubmittedAt([rev({ isBot: true })], MERGED)
    expect(out).toBeNull()
  })

  it('returns_null_when_no_reviews', () => {
    expect(getFirstHumanReviewSubmittedAt([], MERGED)).toBeNull()
  })

  it('review_metric_boundary_submitted_at_equals_merged_at_is_excluded', () => {
    expect(getFirstHumanReviewSubmittedAt([rev({ submittedAt: MERGED })], MERGED)).toBeNull()
  })

  it('self_review_by_pr_author_counts_as_qualifying', () => {
    const out = getFirstHumanReviewSubmittedAt(
      [rev({ submittedAt: new Date('2026-04-08T09:00:00Z') })],
      MERGED,
    )
    expect(out).not.toBeNull()
  })

  it('pr_aggregate_counts_any_qualifying_reviews_per_pr', () => {
    const agg = buildPrAggregate({
      pr: pr(),
      reviews: [
        rev({ submittedAt: new Date('2026-04-08T08:00:00Z'), isBot: false }),
        rev({ submittedAt: new Date('2026-04-08T09:00:00Z'), isBot: true }),
        rev({ state: 'DISMISSED' }),
      ],
      reviewComments: [],
    })
    expect(agg.anyQualifyingReviewCount).toBe(2)
    expect(agg.qualifyingHumanReviewCount).toBe(1)
    expect(agg.qualifyingBotReviewCount).toBe(1)
  })

  it('pr_aggregate_counts_pre_merge_comments_per_pr', () => {
    const agg = buildPrAggregate({
      pr: pr(),
      reviews: [],
      reviewComments: [
        { createdAt: new Date('2026-04-08T08:00:00Z') },
        { createdAt: new Date('2026-04-09T08:00:00Z') },
        { createdAt: MERGED },
        { createdAt: new Date('2026-04-11T08:00:00Z') },
      ],
    })
    expect(agg.preMergeCommentCount).toBe(2)
  })

  it('aggregate_flags_merge_without_review_within_seven_minutes', () => {
    const opened = new Date('2026-04-10T11:55:00Z')
    const merged = new Date('2026-04-10T11:59:00Z')
    const agg = buildPrAggregate({
      pr: pr({ openedAt: opened, mergedAt: merged }),
      reviews: [],
      reviewComments: [],
    })
    expect(agg.mergeWithoutReviewMatchesHygieneRule).toBe(true)
  })
})
