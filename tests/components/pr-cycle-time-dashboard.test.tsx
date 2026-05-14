import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import type { PrCycleTimeDashboard as DashboardModel } from '~/metrics/pr-cycle-time-dashboard'
import { formatCycleDuration } from '~/components/dashboard/format-cycle-duration'
import { PrCycleTimeDashboard } from '~/components/dashboard/PrCycleTimeDashboard'

function baseDashboard(overrides: Partial<DashboardModel> = {}): DashboardModel {
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => ({
    weekStart: `2026-0${1 + i}-01`,
    medianHours: i % 2 === 0 ? 24 : null,
  }))
  return {
    range: { from: '2026-01-01T00:00:00.000Z', to: '2026-05-14T23:59:59.999Z', weeks: 8 },
    metric: {
      medianHours: 36,
      mergedPrCount: 4,
      trendPercent: -10,
      baselineStatus: 'available',
    },
    exceptions: [],
    weeklyTrend,
    teamBreakdown: [
      {
        team: 'Alpha',
        mergedPrs: 4,
        medianHours: 36,
        trendPercent: -10,
        longestOpenPrHours: 12,
      },
    ],
    freshness: {
      reposScanned: 3,
      prMetadataSyncedAt: '2026-05-14T10:00:00.000Z',
      prsMissingJiraKey: 1,
      syncErrors: 0,
      latestSyncStatus: 'success',
    },
    ...overrides,
  }
}

describe('formatCycleDuration', () => {
  it('formats_under_48h_as_hours', () => {
    expect(formatCycleDuration(12)).toBe('12h')
    expect(formatCycleDuration(47.2)).toBe('47.2h')
  })

  it('formats_48h_plus_as_days', () => {
    expect(formatCycleDuration(72)).toBe('3.0 days')
  })
})

describe.sequential('PrCycleTimeDashboard', () => {
  afterEach(() => {
    cleanup()
  })

  it('dashboard_renders_single_metric', () => {
    render(<PrCycleTimeDashboard data={baseDashboard()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Median PR Cycle Time' })).toBeInTheDocument()
    expect(screen.getByTestId('median-pr-cycle-time')).toBeInTheDocument()
  })

  it('dashboard_empty_state_no_merged_prs', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          metric: { medianHours: null, mergedPrCount: 0, trendPercent: null, baselineStatus: 'pending' },
        })}
      />,
    )
    expect(screen.getByTestId('median-pr-cycle-time')).toHaveTextContent('No merged PRs in range')
  })

  it('dashboard_shows_baseline_pending', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          metric: { medianHours: 40, mergedPrCount: 2, trendPercent: null, baselineStatus: 'pending' },
        })}
      />,
    )
    expect(screen.getByText('Baseline pending')).toBeInTheDocument()
  })

  it('dashboard_empty_state_no_repos', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          metric: { medianHours: null, mergedPrCount: 0, trendPercent: null, baselineStatus: 'pending' },
          freshness: {
            reposScanned: 0,
            prMetadataSyncedAt: null,
            prsMissingJiraKey: 0,
            syncErrors: 0,
            latestSyncStatus: 'never_run',
          },
          teamBreakdown: [],
        })}
      />,
    )
    expect(screen.getByText('No repositories discovered')).toBeInTheDocument()
  })

  it('dashboard_shows_data_freshness', () => {
    render(<PrCycleTimeDashboard data={baseDashboard()} />)
    const strip = screen.getByTestId('data-freshness')
    expect(strip).toHaveTextContent('Repos scanned: 3')
    expect(strip).toHaveTextContent('Latest sync: success')
  })

  it('dashboard_shows_sync_failed_state', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          freshness: {
            reposScanned: 1,
            prMetadataSyncedAt: '2026-05-01T12:00:00.000Z',
            prsMissingJiraKey: 0,
            syncErrors: 2,
            latestSyncStatus: 'failed',
          },
        })}
      />,
    )
    expect(screen.getByText('Sync failed')).toBeInTheDocument()
  })

  it('dashboard_renders_8_week_trend_with_empty_weeks', () => {
    render(<PrCycleTimeDashboard data={baseDashboard()} />)
    const trendList = screen.getByTestId('weekly-trend-list')
    const items = within(trendList).getAllByRole('listitem')
    expect(items).toHaveLength(8)
    expect(within(trendList).getAllByText('empty')).toHaveLength(4)
  })

  it('dashboard_renders_team_breakdown', () => {
    render(<PrCycleTimeDashboard data={baseDashboard()} />)
    const table = screen.getByRole('table', { name: /Team breakdown/i })
    expect(within(table).getByRole('cell', { name: 'Alpha' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: '4' })).toBeInTheDocument()
  })

  it('dashboard_renders_unassigned_team', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          teamBreakdown: [
            {
              team: 'Unassigned',
              mergedPrs: 1,
              medianHours: 10,
              trendPercent: null,
              longestOpenPrHours: null,
            },
          ],
        })}
      />,
    )
    const table = screen.getByRole('table', { name: /Team breakdown/i })
    expect(within(table).getByRole('cell', { name: 'Unassigned' })).toBeInTheDocument()
  })

  it('dashboard_renders_pr_cycle_time_exceptions_only', () => {
    render(
      <PrCycleTimeDashboard
        data={baseDashboard({
          exceptions: [
            {
              type: 'baseline_pending',
              severity: 'info',
              team: 'Alpha',
              message: 'Alpha baseline pending',
            },
          ],
        })}
      />,
    )
    expect(screen.getByText(/Alpha baseline pending/)).toBeInTheDocument()
  })

  it('dashboard_does_not_show_future_metrics', () => {
    render(<PrCycleTimeDashboard data={baseDashboard()} />)
    expect(screen.queryByText(/PR Size/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/First Review/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/WIP/i)).not.toBeInTheDocument()
  })

  it('refresh_button_invokes_callback', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<PrCycleTimeDashboard data={baseDashboard()} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRefresh).toHaveBeenCalled()
  })
})
