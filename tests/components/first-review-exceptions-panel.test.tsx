import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { FirstReviewException } from '~/metrics/pr-cycle-time-dashboard'
import { FirstReviewExceptionsPanel } from '~/components/dashboard/FirstReviewExceptionsPanel'

afterEach(cleanup)

function ex(overrides: Partial<FirstReviewException>): FirstReviewException {
  return {
    type: overrides.type ?? 'review_latency_worsened',
    severity: overrides.severity ?? 'warning',
    team: overrides.team ?? 'T',
    message: overrides.message ?? 'msg',
    trendPercent: overrides.trendPercent ?? null,
    prDetails: overrides.prDetails,
  }
}

describe('FirstReviewExceptionsPanel', () => {
  it('review_exceptions_panel_renders_capped_three', () => {
    render(
      <FirstReviewExceptionsPanel
        exceptions={[
          ex({ team: 'A', message: 'a' }),
          ex({ team: 'B', message: 'b' }),
          ex({ team: 'C', message: 'c' }),
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
  })

  it('exceptions_panel_hidden_when_zero_qualifying_exceptions', () => {
    const { container } = render(<FirstReviewExceptionsPanel exceptions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('exceptions_panel_renders_all_three_types', () => {
    render(
      <FirstReviewExceptionsPanel
        exceptions={[
          ex({ type: 'review_latency_worsened', team: 'A', message: 'worsened' }),
          ex({ type: 'merge_without_review', team: 'B', message: 'merge no rev' }),
          ex({ type: 'review_baseline_pending', severity: 'info', team: 'C', message: 'baseline' }),
        ]}
      />,
    )
    expect(screen.getByText('worsened')).toBeTruthy()
    expect(screen.getByText('merge no rev')).toBeTruthy()
    expect(screen.getByText('baseline')).toBeTruthy()
  })

  it('no_review_merge_pr_detail_renders_title_and_repo_only_no_author', () => {
    const { container } = render(
      <FirstReviewExceptionsPanel
        exceptions={[
          ex({
            type: 'merge_without_review',
            team: 'A',
            message: 'merge no review',
            prDetails: [{ prNumber: 7, title: 'fix-bug', repo: 'org/r' }],
          }),
        ]}
      />,
    )
    expect(screen.getByText('fix-bug')).toBeTruthy()
    expect(screen.getByText('org/r')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).not.toMatch(/author/i)
  })
})
