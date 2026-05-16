export type MergeWithoutReviewInput = {
  authorBotFlag: boolean
  anyQualifyingReviewCount: number
  preMergeCommentCount: number
}

export function isMergeWithoutReview(input: MergeWithoutReviewInput): boolean {
  return (
    input.authorBotFlag === false &&
    input.anyQualifyingReviewCount === 0 &&
    input.preMergeCommentCount === 0
  )
}
