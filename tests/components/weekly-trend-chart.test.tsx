import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { WeeklyTrendChart } from '~/components/dashboard/weekly-trend-chart'

afterEach(cleanup)

describe('WeeklyTrendChart', () => {
  it('uses_sparse_line_ticks_for_pr_size_values_above_99', () => {
    const weeklyTrend = [
      { weekStart: '2026-03-30', medianLines: null },
      { weekStart: '2026-04-06', medianLines: 108 },
      { weekStart: '2026-04-13', medianLines: 75 },
      { weekStart: '2026-04-20', medianLines: null },
      { weekStart: '2026-04-27', medianLines: null },
      { weekStart: '2026-05-04', medianLines: null },
      { weekStart: '2026-05-11', medianLines: 54 },
      { weekStart: '2026-05-18', medianLines: 69 },
    ]

    render(<WeeklyTrendChart weeklyTrend={weeklyTrend} ariaLabel="8-week PR size trend" yAxisLabel="Lines" />)

    const chart = screen.getByRole('img', { name: '8-week PR size trend' })
    const yTickLabels = Array.from(chart.querySelectorAll('text[fill="#9ca3af"]')).map(
      (node) => node.textContent,
    )
    const pointYValues = Array.from(chart.querySelectorAll('circle')).map((node) => Number(node.getAttribute('cy')))

    expect(yTickLabels).toEqual(['0', '30', '60', '90', '120'])
    expect(pointYValues.every((y) => y >= 32)).toBe(true)
    expect(screen.getByText('108')).toBeTruthy()
  })
})
