import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import {
  buildDurationAxis,
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

  it('duration_axis_adds_readable_headroom_above_maximum_point', () => {
    const axis = buildDurationAxis(45)
    expect(axis.paddedMax).toBeGreaterThanOrEqual(45 * 1.1)
    expect(axis.paddedMax).toBeLessThanOrEqual(45 * 1.2)
    expect(axis.maxValue).toBeGreaterThanOrEqual(axis.paddedMax)

    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 24 },
          { weekStart: '2026-04-13', medianHours: 45 },
        ]}
      />,
    )

    const pointYValues = Array.from(document.querySelectorAll('circle')).map((node) => Number(node.getAttribute('cy')))
    expect(pointYValues.every((y) => y > 32)).toBe(true)
  })

  it('duration_axis_handles_zero_only_values_without_divide_by_zero', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 0 },
          { weekStart: '2026-04-13', medianHours: 0 },
          { weekStart: '2026-04-20', medianHours: null },
        ]}
      />,
    )

    expect(screen.getByText('Minutes')).toBeTruthy()
    expect(screen.getAllByText('0m')).toHaveLength(2)
    expect(screen.getByText('1')).toBeTruthy()
    const pointYValues = Array.from(document.querySelectorAll('circle')).map((node) => Number(node.getAttribute('cy')))
    expect(pointYValues).toEqual([172, 172])
  })

  it('duration_chart_preserves_null_weeks_as_gaps', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 1 },
          { weekStart: '2026-04-13', medianHours: null },
          { weekStart: '2026-04-20', medianHours: 2 },
        ]}
      />,
    )

    const pathData = Array.from(document.querySelectorAll('path')).map((node) => node.getAttribute('d') ?? '')
    expect(pathData.some((d) => d.startsWith('M 48 ') && d.includes(' L 540 '))).toBe(false)
  })

  it('pr_size_sparse_line_ticks_remain_unchanged', () => {
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

  it('pr_size_chart_preserves_null_weeks_as_gaps', () => {
    render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianLines: 20 },
          { weekStart: '2026-04-13', medianLines: null },
          { weekStart: '2026-04-20', medianLines: 40 },
        ]}
      />,
    )

    const pathData = Array.from(document.querySelectorAll('path')).map((node) => node.getAttribute('d') ?? '')
    expect(pathData.some((d) => d.startsWith('M 48 ') && d.includes(' L 540 '))).toBe(false)
  })

  it('line_chart_accepts_explicit_detached_point', () => {
    render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianLines: 20 },
          { weekStart: '2026-04-13', medianLines: 40 },
        ]}
        detachedPoint={{
          weekStart: '2026-04-20',
          medianLines: 55,
          label: 'Apr 20 so far',
          ariaLabel: 'Current week so far: 55 median lines',
        }}
      />,
    )

    const chart = screen.getByRole('img', { name: '8-week PR size trend' })
    const pointLabels = Array.from(chart.querySelectorAll('text[font-weight="600"]')).map(
      (node) => node.textContent,
    )
    expect(pointLabels).toEqual(['20', '40', '55'])
    expect(screen.getByText('Apr 20 so far')).toBeTruthy()
    expect(chart.querySelectorAll('circle')).toHaveLength(3)
  })

  it('line_chart_detached_point_has_own_x_axis_slot_and_label', () => {
    render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianLines: 20 },
          { weekStart: '2026-04-13', medianLines: 40 },
        ]}
        detachedPoint={{
          weekStart: '2026-04-20',
          medianLines: 55,
          label: 'Apr 20 so far',
          ariaLabel: 'Current week so far: 55 median lines',
        }}
      />,
    )

    const circles = Array.from(document.querySelectorAll('circle'))
    const cxValues = circles.map((node) => Number(node.getAttribute('cx')))
    expect(cxValues[2]).toBeGreaterThan(cxValues[1]!)
    expect(screen.getByText('Apr 20 so far')).toBeTruthy()
  })

  it('line_chart_detached_point_exposes_aria_label', () => {
    render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={[{ weekStart: '2026-04-06', medianLines: 20 }]}
        detachedPoint={{
          weekStart: '2026-04-13',
          medianLines: 30,
          label: 'Apr 13 so far',
          ariaLabel: 'Current week so far: 30 median lines',
        }}
      />,
    )

    const detachedMarker = document.querySelector('[aria-label="Current week so far: 30 median lines"]')
    expect(detachedMarker).toBeTruthy()
    expect(detachedMarker?.querySelector('title')?.textContent).toBe(
      'Current week so far: 30 median lines',
    )
  })

  it('line_chart_plain_series_does_not_infer_detachment_from_length', () => {
    const weeklyTrend = [
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
      '2026-02-23',
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ].map((weekStart, i) => ({ weekStart, medianLines: 10 + i }))

    render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={weeklyTrend}
        ariaLabel="9-week PR size trend"
      />,
    )

    expect(screen.queryByText(/so far/i)).toBeNull()
    expect(document.querySelectorAll('circle')).toHaveLength(9)
    const pathData = Array.from(document.querySelectorAll('path')).map((node) => node.getAttribute('d') ?? '')
    expect(pathData.some((d) => d.includes(' L '))).toBe(true)
  })

  it('duration_chart_props_do_not_gain_detached_behavior', () => {
    render(
      <WeeklyTrendChart
        valueMode="duration"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianHours: 24 },
          { weekStart: '2026-04-13', medianHours: 48 },
        ]}
        ariaLabel="8-week PR cycle time trend"
      />,
    )

    expect(screen.getByRole('img', { name: '8-week PR cycle time trend' })).toBeTruthy()
    expect(screen.getByText('Days')).toBeTruthy()
    expect(screen.getByText('1d')).toBeTruthy()
    expect(screen.getByText('2d')).toBeTruthy()
    expect(document.querySelectorAll('circle')).toHaveLength(2)
    expect(screen.queryByText(/so far/i)).toBeNull()
  })

  it('pr_size_line_mode_handles_all_null_or_empty_line_trend', () => {
    const { rerender } = render(
      <WeeklyTrendChart
        valueMode="lines"
        yAxisLabel="Lines"
        weeklyTrend={[
          { weekStart: '2026-04-06', medianLines: null },
          { weekStart: '2026-04-13', medianLines: null },
        ]}
      />,
    )

    expect(screen.getByText('Lines')).toBeTruthy()
    expect(document.querySelectorAll('circle')).toHaveLength(0)

    rerender(<WeeklyTrendChart valueMode="lines" yAxisLabel="Lines" weeklyTrend={[]} />)
    expect(screen.getByText('Lines')).toBeTruthy()
    expect(document.querySelectorAll('circle')).toHaveLength(0)
  })
})
