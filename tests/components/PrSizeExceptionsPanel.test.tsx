import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { PrSizeException } from '~/metrics/pr-cycle-time-dashboard'
import { PrSizeExceptionsPanel } from '~/components/dashboard/PrSizeExceptionsPanel'

afterEach(cleanup)

function ex(overrides: Partial<PrSizeException> = {}): PrSizeException {
  return {
    type: 'oversized_pr_pattern',
    severity: 'warning',
    team: 'alpha',
    message: '2 of 4 PRs exceed 2× team median',
    flaggedPrCount: 2,
    totalPrCount: 4,
    ...overrides,
  }
}

describe('PrSizeExceptionsPanel', () => {
  it('panel_hidden_when_no_exceptions', () => {
    const { container } = render(<PrSizeExceptionsPanel exceptions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('panel_shows_team_and_description', () => {
    render(
      <PrSizeExceptionsPanel
        exceptions={[ex({ team: 'platform', message: '2 of 4 PRs exceed 2× team median' })]}
      />,
    )
    expect(screen.getByText('platform')).toBeTruthy()
    expect(screen.getByText('2 of 4 PRs exceed 2× team median')).toBeTruthy()
  })

  it('panel_shows_multiple_exceptions', () => {
    render(
      <PrSizeExceptionsPanel
        exceptions={[
          ex({ team: 'alpha', message: '2 of 4 PRs exceed 2× team median' }),
          ex({ team: 'beta', message: '3 of 5 PRs exceed 2× team median' }),
          ex({ team: 'gamma', message: '2 of 3 PRs exceed 2× team median' }),
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(screen.getByText('alpha')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.getByText('gamma')).toBeTruthy()
  })
})
