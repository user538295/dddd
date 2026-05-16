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
})
