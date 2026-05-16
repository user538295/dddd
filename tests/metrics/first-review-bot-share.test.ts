import { describe, expect, it } from 'vitest'
import { computeBotShare } from '~/metrics/first-review-bot-share'
import type { PrAggregate } from '~/metrics/first-review-time'

const RANGE = {
  start: new Date('2026-04-01T00:00:00Z'),
  end: new Date('2026-04-30T00:00:00Z'),
}
const SYNCED = new Set(['r-1'])

function agg(overrides: Partial<PrAggregate>): PrAggregate {
  return {
    prId: overrides.prId ?? `pr-${Math.random()}`,
    prNumber: 1,
    title: 't',
    repoId: overrides.repoId ?? 'r-1',
    repoFullName: 'o/r',
    team: 'T',
    openedAt: new Date('2026-04-10T00:00:00Z'),
    mergedAt: new Date('2026-04-12T00:00:00Z'),
    firstQualifyingHumanReviewAt: overrides.firstQualifyingHumanReviewAt ?? null,
    anyQualifyingReviewCount: overrides.anyQualifyingReviewCount ?? 0,
    qualifyingHumanReviewCount: overrides.qualifyingHumanReviewCount ?? 0,
    qualifyingBotReviewCount: overrides.qualifyingBotReviewCount ?? 0,
    firstQualifyingReviewIsBot: overrides.firstQualifyingReviewIsBot ?? false,
    preMergeCommentCount: 0,
    mergeWithoutReviewMatchesHygieneRule: false,
  }
}

describe('first-review bot share', () => {
  it('bot_share_denominator_includes_bots', () => {
    const out = computeBotShare({
      prs: [
        agg({
          anyQualifyingReviewCount: 3,
          qualifyingHumanReviewCount: 2,
          qualifyingBotReviewCount: 1,
        }),
      ],
      reviewSyncedRepoIds: SYNCED,
      range: RANGE,
    })
    expect(out).not.toBeNull()
    expect(out!.botReviewCount + out!.humanReviewCount).toBe(3)
  })

  it('first_review_by_bot_count_K', () => {
    const out = computeBotShare({
      prs: [
        agg({
          anyQualifyingReviewCount: 2,
          qualifyingBotReviewCount: 1,
          qualifyingHumanReviewCount: 1,
          firstQualifyingReviewIsBot: true,
        }),
        agg({
          anyQualifyingReviewCount: 1,
          qualifyingBotReviewCount: 1,
          firstQualifyingReviewIsBot: false,
        }),
      ],
      reviewSyncedRepoIds: SYNCED,
      range: RANGE,
    })
    expect(out!.firstReviewByBotCount).toBe(1)
  })

  it('K_excludes_prs_with_zero_qualifying_reviews', () => {
    const out = computeBotShare({
      prs: [
        agg({ anyQualifyingReviewCount: 0, firstQualifyingReviewIsBot: false }),
        agg({
          anyQualifyingReviewCount: 1,
          qualifyingBotReviewCount: 1,
          firstQualifyingReviewIsBot: true,
        }),
      ],
      reviewSyncedRepoIds: SYNCED,
      range: RANGE,
    })
    expect(out!.firstReviewByBotCount).toBe(1)
  })

  it('bot_share_returns_null_when_B_zero', () => {
    const out = computeBotShare({
      prs: [agg({ qualifyingHumanReviewCount: 2, qualifyingBotReviewCount: 0 })],
      reviewSyncedRepoIds: SYNCED,
      range: RANGE,
    })
    expect(out).toBeNull()
  })

  it('bot_share_uses_N_population_only', () => {
    const out = computeBotShare({
      prs: [
        agg({
          repoId: 'r-other',
          qualifyingBotReviewCount: 5,
          anyQualifyingReviewCount: 5,
        }),
      ],
      reviewSyncedRepoIds: SYNCED,
      range: RANGE,
    })
    expect(out).toBeNull()
  })
})
