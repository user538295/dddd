import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { PrSizeMetric } from '~/metrics/pr-cycle-time-dashboard'
import { PrSizeCard } from '~/components/dashboard/PrSizeCard'

afterEach(cleanup)

function metric(overrides: Partial<PrSizeMetric> = {}): PrSizeMetric {
  return {
    medianLines: 312,
    medianChangedFiles: 5,
    previousMedianLines: 260,
    trendPercent: 20,
    baselineStatus: 'available',
    qualifyingPrCount: 10,
    ...overrides,
  }
}

describe('PrSizeCard', () => {
  it('renders_median_lines_value', () => {
    render(<PrSizeCard metric={metric({ medianLines: 312 })} />)
    expect(screen.getByText(/312/)).toBeTruthy()
  })

  it('renders_across_n_files_secondary_line', () => {
    render(<PrSizeCard metric={metric({ medianChangedFiles: 5 })} />)
    expect(screen.getByText('across 5 files')).toBeTruthy()
  })

  it('omits_secondary_line_when_changed_files_null', () => {
    render(<PrSizeCard metric={metric({ medianChangedFiles: null })} />)
    expect(screen.queryByText(/across \d+ files/)).toBeNull()
  })

  it('shows_baseline_pending_when_pending', () => {
    render(<PrSizeCard metric={metric({ baselineStatus: 'pending' })} />)
    expect(screen.getByText('Baseline pending')).toBeTruthy()
    expect(screen.queryByText(/\+/)).toBeNull()
  })

  it('shows_trend_arrow_when_available', () => {
    render(
      <PrSizeCard
        metric={metric({ baselineStatus: 'available', trendPercent: 20 })}
      />,
    )
    expect(screen.getByText(/\+20%/)).toBeTruthy()
  })
})
