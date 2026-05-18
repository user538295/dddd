import { describe, expect, it } from 'vitest'

import { median } from '~/metrics/math'
import { median as medianFromSummary } from '~/metrics/pr-cycle-time-summary'

describe('median', () => {
  it('median_returns_middle_for_odd_length', () => {
    expect(median([1, 3, 5])).toBe(3)
  })

  it('median_averages_two_middles_for_even_length', () => {
    expect(median([1, 3])).toBe(2)
  })

  it('median_returns_null_for_empty_array', () => {
    expect(median([])).toBeNull()
  })

  it('median_sorts_before_computing', () => {
    expect(median([5, 1, 3])).toBe(3)
  })

  it('pr_cycle_time_summary_median_import_still_works', () => {
    expect(medianFromSummary([1, 3, 5])).toBe(3)
    expect(medianFromSummary([1, 3])).toBe(2)
    expect(medianFromSummary([])).toBeNull()
  })
})
