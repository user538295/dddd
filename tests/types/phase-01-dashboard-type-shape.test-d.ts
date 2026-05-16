// Type-level regression guard for Task 0.1 — Phase 02 removal.
// Verified by `tsc --noEmit` (see tsconfig include).

import type { PrCycleTimeDashboard } from '~/metrics/pr-cycle-time-dashboard'
// @ts-expect-error FirstReviewException removed from pr-cycle-time-dashboard in Task 0.1
import type { FirstReviewException } from '~/metrics/pr-cycle-time-dashboard'

// Helper: equality check for types (https://github.com/microsoft/TypeScript/issues/27024)
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
type Expect<T extends true> = T

// 1. `firstReview` no longer exists on the payload type.
declare const payload: PrCycleTimeDashboard
// @ts-expect-error firstReview removed in Task 0.1
const phase02Probe: unknown = payload.firstReview
void phase02Probe

// 2. After the import error above is consumed by `@ts-expect-error`,
//    `FirstReviewException` resolves to `any` — referenced here to keep
//    the import live so the directive remains the active guard.
export type RemovedFirstReviewException = FirstReviewException

// 3. Sanity: Phase 01 payload shape still exposes the locked metric union.
export type Phase01BaselineStatusIsLocked = Expect<
  Equal<PrCycleTimeDashboard['metric']['baselineStatus'], 'available' | 'pending'>
>
