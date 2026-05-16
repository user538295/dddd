import { sortExceptionsBySeverityThenMagnitude } from '~/metrics/exception-sort'
import type { PrAggregate } from '~/metrics/first-review-time'

export type TeamFirstReviewAgg = {
  team: string
  currentQualifyingPrCount: number
  previousQualifyingPrCount: number
  medianHours: number | null
  previousMedianHours: number | null
  trendPercent: number | null
  noReviewMergeCount: number | null
}

export type FirstReviewExceptionType =
  | 'review_latency_worsened'
  | 'merge_without_review'
  | 'review_baseline_pending'

export type FirstReviewExceptionPrDetail = {
  prNumber: number
  title: string
  repo: string
}

export type FirstReviewException = {
  type: FirstReviewExceptionType
  severity: 'warning' | 'info'
  team: string
  trendPercent: number | null
  prDetails?: FirstReviewExceptionPrDetail[]
}

const WORSENED_THRESHOLD_PERCENT = 25

export function buildFirstReviewExceptions(input: {
  teams: TeamFirstReviewAgg[]
  prs: PrAggregate[]
}): FirstReviewException[] {
  const exceptions: FirstReviewException[] = []
  const prDetailsByTeam = new Map<string, FirstReviewExceptionPrDetail[]>()
  for (const p of input.prs) {
    if (!p.mergeWithoutReviewMatchesHygieneRule) continue
    const list = prDetailsByTeam.get(p.team) ?? []
    list.push({ prNumber: p.prNumber, title: p.title, repo: p.repoFullName })
    prDetailsByTeam.set(p.team, list)
  }

  for (const t of input.teams) {
    const hasBaseline =
      t.previousQualifyingPrCount >= 3 &&
      t.previousMedianHours !== null &&
      t.previousMedianHours > 0

    if (hasBaseline && t.medianHours !== null && t.previousMedianHours !== null) {
      const ratio = t.medianHours / t.previousMedianHours
      if (ratio >= 1 + WORSENED_THRESHOLD_PERCENT / 100) {
        exceptions.push({
          type: 'review_latency_worsened',
          severity: 'warning',
          team: t.team,
          trendPercent: t.trendPercent,
        })
      }
    }

    const hygienePrs = prDetailsByTeam.get(t.team)
    if (hygienePrs && hygienePrs.length > 0) {
      exceptions.push({
        type: 'merge_without_review',
        severity: 'warning',
        team: t.team,
        trendPercent: t.trendPercent,
        prDetails: hygienePrs,
      })
    }

    if (t.currentQualifyingPrCount >= 1 && t.previousQualifyingPrCount < 3) {
      exceptions.push({
        type: 'review_baseline_pending',
        severity: 'info',
        team: t.team,
        trendPercent: null,
      })
    }
  }

  sortExceptionsBySeverityThenMagnitude(exceptions, (e) =>
    e.trendPercent === null ? null : Math.abs(e.trendPercent),
  )

  return exceptions.slice(0, 3)
}
