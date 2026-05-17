import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { FirstReviewMetric } from '~/metrics/pr-cycle-time-dashboard'
import { FirstReviewCard } from '~/components/dashboard/FirstReviewCard'

afterEach(cleanup)

function metric(overrides: Partial<FirstReviewMetric> = {}): FirstReviewMetric {
  return {
    medianHours: 5,
    previousMedianHours: 4,
    qualifyingPrCount: 3,
    mergedPrCountInSyncedRepos: 5,
    trendPercent: 25,
    baselineStatus: 'available',
    botShare: null,
    ...overrides,
  }
}

describe('FirstReviewCard', () => {
  it('card_subtitle_reads_first_human_review', () => {
    render(<FirstReviewCard metric={metric()} />)
    expect(screen.getByText('PR opened to first human review')).toBeTruthy()
  })

  it('card_subtitle_and_coverage_suppressed_when_N_zero', () => {
    render(<FirstReviewCard metric={metric({ mergedPrCountInSyncedRepos: 0, qualifyingPrCount: 0 })} />)
    expect(screen.queryByText('PR opened to first human review')).toBeNull()
    expect(screen.queryByText(/Median over/)).toBeNull()
    expect(screen.getByText('No merged PRs in range')).toBeTruthy()
  })

  it('coverage_subtitle_renders_M_of_N', () => {
    render(<FirstReviewCard metric={metric()} />)
    expect(screen.getByText('3 reviewed PRs analyzed')).toBeTruthy()
    expect(screen.getByText('Median over 3 of 5 merged PRs with a human review')).toBeTruthy()
  })

  it('first_review_card_uses_dashboard_metric_classes', () => {
    const { container } = render(<FirstReviewCard metric={metric()} />)
    expect(container.querySelector('.pr-dashboard__card.pr-dashboard__metric')).toBeTruthy()
    expect(screen.getByTestId('median-first-review-time')).toHaveTextContent('5h')
    expect(screen.getByText(/\+25%/)).toBeTruthy()
    expect(screen.getByText('(4h)')).toBeTruthy()
  })

  it('bot_share_side_stat_renders', () => {
    render(
      <FirstReviewCard
        metric={metric({
          botShare: { botReviewCount: 2, humanReviewCount: 8, firstReviewByBotCount: 1 },
        })}
      />,
    )
    expect(screen.getByText(/Bots: 2 reviews \(20%/)).toBeTruthy()
  })

  it('bot_share_side_stat_absent_when_B_zero', () => {
    render(<FirstReviewCard metric={metric({ botShare: null })} />)
    expect(screen.queryByText(/Bots:/)).toBeNull()
  })

  it('card_shows_no_review_message_when_M_zero_N_positive', () => {
    render(<FirstReviewCard metric={metric({ qualifyingPrCount: 0, mergedPrCountInSyncedRepos: 5 })} />)
    expect(screen.getByText('No merged PRs with a human review in range')).toBeTruthy()
  })

  it('first_review_card_body_renders_baseline_pending_text_when_status_pending', () => {
    render(
      <FirstReviewCard metric={metric({ baselineStatus: 'pending', qualifyingPrCount: 3 })} />,
    )
    expect(screen.getByText('Baseline pending')).toBeTruthy()
  })
})
