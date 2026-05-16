import { describe, expect, it } from 'vitest'
import { sortExceptionsBySeverityThenMagnitude } from '~/metrics/exception-sort'

type E = { severity: 'warning' | 'info'; team: string; trend: number | null }

function sort(items: E[]): E[] {
  const copy = items.slice()
  sortExceptionsBySeverityThenMagnitude(copy, (e) =>
    e.trend === null ? null : Math.abs(e.trend),
  )
  return copy
}

describe('shared exception sort', () => {
  it('exception_sort_helper_orders_by_severity_then_abs_trend_then_team_name', () => {
    const items: E[] = [
      { severity: 'info', team: 'A', trend: 50 },
      { severity: 'warning', team: 'B', trend: 10 },
      { severity: 'warning', team: 'A', trend: 30 },
      { severity: 'info', team: 'Z', trend: 5 },
    ]
    const out = sort(items)
    expect(out.map((e) => `${e.severity}-${e.team}`)).toEqual([
      'warning-A',
      'warning-B',
      'info-A',
      'info-Z',
    ])
  })

  it('exception_sort_helper_null_trend_sorts_last_within_severity', () => {
    const items: E[] = [
      { severity: 'warning', team: 'A', trend: null },
      { severity: 'warning', team: 'B', trend: 10 },
    ]
    expect(sort(items).map((e) => e.team)).toEqual(['B', 'A'])
  })

  it('sort_helper_places_null_magnitude_after_zero_magnitude', () => {
    const items: E[] = [
      { severity: 'warning', team: 'A', trend: null },
      { severity: 'warning', team: 'B', trend: 0 },
    ]
    expect(sort(items).map((e) => e.team)).toEqual(['B', 'A'])
  })

  it('exception_sort_helper_stable_within_ties', () => {
    const items: E[] = [
      { severity: 'warning', team: 'A', trend: 10 },
      { severity: 'warning', team: 'A', trend: 10 },
    ]
    const out = sort(items)
    expect(out.map((e) => e.trend)).toEqual([10, 10])
    expect(out[0]).toBe(items[0])
    expect(out[1]).toBe(items[1])
  })

  it('phase_01_sortExceptions_orders_fixed_fixture_inputs_in_exact_expected_order', () => {
    const items: E[] = [
      { severity: 'info', team: 'Beta', trend: null },
      { severity: 'warning', team: 'Alpha', trend: -40 },
      { severity: 'info', team: 'Alpha', trend: null },
      { severity: 'warning', team: 'Gamma', trend: 25 },
      { severity: 'warning', team: 'Beta', trend: 0 },
    ]
    expect(sort(items).map((e) => `${e.severity}-${e.team}`)).toEqual([
      'warning-Alpha',
      'warning-Gamma',
      'warning-Beta',
      'info-Alpha',
      'info-Beta',
    ])
  })
})
