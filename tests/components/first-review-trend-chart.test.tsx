import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FirstReviewTrendChart } from '~/components/dashboard/FirstReviewTrendChart'

afterEach(cleanup)

describe('FirstReviewTrendChart', () => {
  it('trend_chart_renders_with_null_weeks_when_M_zero', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      weekStart: `2026-0${1 + i}-01`,
      medianHours: null,
    }))
    render(<FirstReviewTrendChart weeklyTrend={data} />)
    expect(screen.getByTestId('first-review-trend')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '8-week First Review trend' })).toBeTruthy()
  })

  it('trend_chart_renders_eight_buckets', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      weekStart: `2026-0${1 + i}-01`,
      medianHours: i,
    }))
    render(<FirstReviewTrendChart weeklyTrend={data} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(8)
  })

  it('first_review_trend_uses_hours_for_hour_scale_values', () => {
    render(
      <FirstReviewTrendChart
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 1 },
          { weekStart: '2026-04-13', medianHours: 12.5 },
        ]}
      />,
    )

    expect(screen.getByText('Hours')).toBeTruthy()
    expect(screen.getAllByText('12.5h')).toHaveLength(2)
  })

  it('first_review_sr_trend_preserves_null_vs_zero_duration', () => {
    render(
      <FirstReviewTrendChart
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: null },
          { weekStart: '2026-04-13', medianHours: 0 },
        ]}
      />,
    )

    const list = screen.getByTestId('first-review-weekly-trend-list')
    expect(list).toHaveTextContent('—')
    expect(list).toHaveTextContent('0m')
  })

  it('first_review_sr_uses_one_day_unit_for_mixed_values', () => {
    render(
      <FirstReviewTrendChart
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 0.5 },
          { weekStart: '2026-04-13', medianHours: 48 },
        ]}
      />,
    )

    expect(screen.getByText('Days')).toBeTruthy()
    expect(screen.getAllByText('0.02d')).toHaveLength(2)
    expect(screen.getAllByText('2d')).toHaveLength(2)
  })
})
