import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { PrSizeTrendChart } from '~/components/dashboard/PrSizeTrendChart'
import { WeeklyTrendChart } from '~/components/dashboard/weekly-trend-chart'

vi.mock('~/components/dashboard/weekly-trend-chart', () => ({
  WeeklyTrendChart: vi.fn(() => null),
}))

const MockedWeeklyTrendChart = vi.mocked(WeeklyTrendChart)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PrSizeTrendChart', () => {
  it('renders_chart_with_data_points', () => {
    const data = [
      { weekStart: '2026-01-06', medianLines: 100 },
      { weekStart: '2026-01-13', medianLines: 200 },
      { weekStart: '2026-01-20', medianLines: 150 },
      { weekStart: '2026-01-27', medianLines: 300 },
    ]
    render(<PrSizeTrendChart weeklyTrend={data} />)
    expect(screen.getByTestId('pr-size-trend')).toBeTruthy()
    expect(MockedWeeklyTrendChart).toHaveBeenCalled()
  })

  it('null_weeks_not_mapped_to_zero', () => {
    const data = [
      { weekStart: '2026-01-06', medianLines: 100 },
      { weekStart: '2026-01-13', medianLines: null },
      { weekStart: '2026-01-20', medianLines: null },
      { weekStart: '2026-01-27', medianLines: 300 },
    ]
    render(<PrSizeTrendChart weeklyTrend={data} />)
    const passedTrend = MockedWeeklyTrendChart.mock.calls[0]?.[0]?.weeklyTrend
    expect(passedTrend).toEqual(data)
    expect(passedTrend?.[1]).toEqual({ weekStart: '2026-01-13', medianLines: null })
  })
})
