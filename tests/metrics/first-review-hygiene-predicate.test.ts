import { describe, expect, it } from 'vitest'
import { isMergeWithoutReview } from '~/metrics/first-review-hygiene-predicate'

describe('first-review hygiene predicate', () => {
  it('predicate_returns_true_when_no_qualifying_reviews_and_no_pre_merge_comments', () => {
    expect(
      isMergeWithoutReview({
        authorBotFlag: false,
        anyQualifyingReviewCount: 0,
        preMergeCommentCount: 0,
      }),
    ).toBe(true)
  })

  it('predicate_returns_false_when_any_qualifying_review_exists', () => {
    expect(
      isMergeWithoutReview({
        authorBotFlag: false,
        anyQualifyingReviewCount: 1,
        preMergeCommentCount: 0,
      }),
    ).toBe(false)
  })

  it('predicate_returns_false_when_pre_merge_comment_exists', () => {
    expect(
      isMergeWithoutReview({
        authorBotFlag: false,
        anyQualifyingReviewCount: 0,
        preMergeCommentCount: 1,
      }),
    ).toBe(false)
  })

  it('predicate_returns_false_when_author_is_bot', () => {
    expect(
      isMergeWithoutReview({
        authorBotFlag: true,
        anyQualifyingReviewCount: 0,
        preMergeCommentCount: 0,
      }),
    ).toBe(false)
  })
})
