import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { PrSizeTeamRow } from '~/metrics/pr-cycle-time-dashboard'
import { PrSizeTeamTable } from '~/components/dashboard/PrSizeTeamTable'

afterEach(cleanup)

function row(o: Partial<PrSizeTeamRow> = {}): PrSizeTeamRow {
  return {
    team: o.team ?? 'Platform',
    prCount: o.prCount ?? 4,
    medianLines: o.medianLines === undefined ? 200 : o.medianLines,
    trend: o.trend ?? '↑',
    largestPrTitle: o.largestPrTitle ?? 'Big refactor',
    largestPrRepo: o.largestPrRepo ?? 'org/repo',
    largestPrUrl: o.largestPrUrl ?? 'https://github.com/org/repo/pull/1',
    largestPrLines: o.largestPrLines ?? 800,
  }
}

describe('PrSizeTeamTable', () => {
  it('renders_all_columns', () => {
    render(<PrSizeTeamTable rows={[row()]} />)
    expect(screen.getByText('Team')).toBeTruthy()
    expect(screen.getByText('PRs merged')).toBeTruthy()
    expect(screen.getByText('Median size (lines)')).toBeTruthy()
    expect(screen.getByText('Trend')).toBeTruthy()
    expect(screen.getByText('Largest PR')).toBeTruthy()
    expect(screen.getByText('Platform')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('200 lines')).toBeTruthy()
    expect(screen.getByText('Big refactor')).toBeTruthy()
    expect(screen.getByText(/org\/repo/)).toBeTruthy()
  })

  it('trend_arrows_rendered_correctly', () => {
    render(
      <PrSizeTeamTable
        rows={[
          row({ team: 'Up', trend: '↑' }),
          row({ team: 'Down', trend: '↓' }),
          row({ team: 'Flat', trend: '→' }),
          row({ team: 'Dash', trend: '—' }),
        ]}
      />,
    )
    expect(screen.getByText('↑')).toBeTruthy()
    expect(screen.getByText('↓')).toBeTruthy()
    expect(screen.getByText('→')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('largest_pr_is_a_link', () => {
    render(
      <PrSizeTeamTable
        rows={[
          row({
            largestPrTitle: 'Big refactor',
            largestPrRepo: 'org/repo',
            largestPrUrl: 'https://github.com/org/repo/pull/1',
          }),
        ]}
      />,
    )
    const link = screen.getByRole('link', { name: /Big refactor/i })
    expect(link.getAttribute('href')).toBe('https://github.com/org/repo/pull/1')
  })

  it('no_author_names_in_output', () => {
    const { container } = render(
      <PrSizeTeamTable
        rows={[
          row({
            largestPrTitle: 'Fix login',
            largestPrRepo: 'org/app',
          }),
        ]}
      />,
    )
    expect(container.textContent).not.toMatch(/author/i)
  })
})
