import { describe, expectTypeOf, it } from 'vitest'
import type {
  FirstReview,
  FirstReviewException,
  FirstReviewMetric,
  FirstReviewTeamRow,
  PrCycleTimeDashboard,
  ReviewFreshness,
  ReviewMetricsPending,
  SyncError,
} from '~/metrics/pr-cycle-time-dashboard'

describe('phase 02 payload types', () => {
  it('phase_01_freshness_type_shape_unchanged', () => {
    expectTypeOf<PrCycleTimeDashboard['freshness']>().toEqualTypeOf<{
      reposScanned: number
      prMetadataSyncedAt: string | null
      prsMissingJiraKey: number
      syncErrors: number
      latestSyncStatus: 'success' | 'partial' | 'failed' | 'never_run'
    }>()
  })

  it('phase_01_payload_fields_unchanged_regression', () => {
    expectTypeOf<PrCycleTimeDashboard['range']>().toEqualTypeOf<{
      from: string
      to: string
      weeks: number
    }>()
  })

  it('phase_02_payload_fields_are_optional', () => {
    const partial: PrCycleTimeDashboard = {
      range: { from: '', to: '', weeks: 0 },
      metric: {
        medianHours: null,
        previousMedianHours: null,
        mergedPrCount: 0,
        trendPercent: null,
        baselineStatus: 'pending',
      },
      exceptions: [],
      weeklyTrend: [],
      comparisonWeeklyTrend: [],
      teamBreakdown: [],
      freshness: {
        reposScanned: 0,
        prMetadataSyncedAt: null,
        prsMissingJiraKey: 0,
        syncErrors: 0,
        latestSyncStatus: 'never_run',
      },
    }
    // No firstReview/reviewFreshness/reviewMetricsPending — compiles.
    expect(partial.firstReview).toBeUndefined()
    expect(partial.reviewFreshness).toBeUndefined()
    expect(partial.reviewMetricsPending).toBeUndefined()
  })

  it('first_review_types_are_exported', () => {
    expectTypeOf<FirstReview>().toBeObject()
    expectTypeOf<FirstReviewMetric>().toBeObject()
    expectTypeOf<FirstReviewException>().toBeObject()
    expectTypeOf<FirstReviewTeamRow>().toBeObject()
    expectTypeOf<SyncError>().toBeObject()
    expectTypeOf<ReviewFreshness>().toBeObject()
    expectTypeOf<ReviewMetricsPending>().toBeObject()
  })
})

import { expect } from 'vitest'
