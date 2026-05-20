import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import {
  formatDurationHoursForChart,
} from '~/components/dashboard/duration-trend-scale'
import { WeeklyTrendChart } from '~/components/dashboard/weekly-trend-chart'

afterEach(cleanup)

describe('WeeklyTrendChart', () => {
  it('duration_chart_uses_minutes_under_one_hour', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 0.25 },
          { weekStart: '2026-04-13', medianHours: 0.5 },
        ]}
      />,
    )

    expect(screen.getByText('Minutes')).toBeTruthy()
    expect(screen.getByText('30m')).toBeTruthy()
  })

  it('duration_chart_uses_hours_from_one_to_under_forty_eight_hours', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 1 },
          { weekStart: '2026-04-13', medianHours: 47.9 },
        ]}
      />,
    )

    expect(screen.getByText('Hours')).toBeTruthy()
    expect(screen.getByText('47.9h')).toBeTruthy()
  })

  it('duration_chart_uses_days_at_forty_eight_hours_or_more', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 24 },
          { weekStart: '2026-04-13', medianHours: 48 },
        ]}
      />,
    )

    expect(screen.getByText('Days')).toBeTruthy()
    expect(screen.getByText('2d')).toBeTruthy()
  })

  it('duration_chart_defaults_to_hours_for_all_null_weeks', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: null },
          { weekStart: '2026-04-13', medianHours: null },
        ]}
      />,
    )

    expect(screen.getByText('Hours')).toBeTruthy()
    expect(document.querySelectorAll('circle')).toHaveLength(0)
  })

  it('duration_chart_defaults_to_hours_for_empty_duration_trend', () => {
    render(<WeeklyTrendChart valueMode="duration" weeklyTrend={[]} />)

    expect(screen.getByText('Hours')).toBeTruthy()
    expect(document.querySelectorAll('circle')).toHaveLength(0)
  })

  it('duration_chart_keeps_tiny_non_zero_values_visible_on_day_axis', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 0.5 },
          { weekStart: '2026-04-13', medianHours: 48 },
        ]}
      />,
    )

    expect(screen.getByText('0.02d')).toBeTruthy()
    expect(screen.queryByText('0.0')).toBeNull()
    expect(screen.queryByText('0.0d')).toBeNull()
  })

  it('duration_formatter_contract_is_raw_hours_for_wrapper_text', () => {
    expect(formatDurationHoursForChart(0.5, 'minutes')).toBe('30m')
    expect(formatDurationHoursForChart(1.5, 'hours')).toBe('1.5h')
    expect(formatDurationHoursForChart(0.5, 'days')).toBe('0.02d')
  })

  it('duration_formatter_keeps_tiny_positive_values_non_zero_in_each_unit', () => {
    const labels = [
      formatDurationHoursForChart(0.000001, 'minutes'),
      formatDurationHoursForChart(0.004, 'hours'),
      formatDurationHoursForChart(0.004, 'days'),
    ]

    expect(labels).toEqual(['0.0001m', '0.004h', '0.0002d'])
    for (const label of labels) {
      expect(label).not.toMatch(/^0(?:\.0+)?[mhd]?$/)
    }
  })

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

    render(<WeeklyTrendChart valueMode="lines" weeklyTrend={weeklyTrend} ariaLabel="8-week PR size trend" yAxisLabel="Lines" />)

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
