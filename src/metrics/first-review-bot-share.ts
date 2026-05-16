import type { DateRange, PrAggregate } from '~/metrics/first-review-time'

export type BotShareResult = {
  botReviewCount: number
  humanReviewCount: number
  firstReviewByBotCount: number
}

function isInRange(date: Date, range: DateRange): boolean {
  const t = date.getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}

export function computeBotShare(input: {
  prs: PrAggregate[]
  reviewSyncedRepoIds: Set<string>
  range: DateRange
}): BotShareResult | null {
  const inN = input.prs.filter(
    (p) => input.reviewSyncedRepoIds.has(p.repoId) && isInRange(p.mergedAt, input.range),
  )
  let B = 0
  let H = 0
  let K = 0
  for (const p of inN) {
    B += p.qualifyingBotReviewCount
    H += p.qualifyingHumanReviewCount
    if (p.anyQualifyingReviewCount > 0 && p.firstQualifyingReviewIsBot) K += 1
  }
  if (B === 0) return null
  return { botReviewCount: B, humanReviewCount: H, firstReviewByBotCount: K }
}
