import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dirname, '../..')

describe('test harness', () => {
  it('test_vitest_setup_works', () => {
    expect(1 + 1).toBe(2)
  })

  it('test_react_testing_library_setup_works', () => {
    render(React.createElement('span', { 'data-testid': 'trivial' }, 'ok'))
    expect(screen.getByTestId('trivial')).toHaveTextContent('ok')
  })

  it('test_coverage_threshold_configured', () => {
    const vitestConfigSrc = fs.readFileSync(
      path.join(root, 'vitest.config.ts'),
      'utf8',
    )
    expect(vitestConfigSrc).toMatch(/lines:\s*85/)
    expect(vitestConfigSrc).toMatch(/functions:\s*85/)
    expect(vitestConfigSrc).toMatch(/branches:\s*85/)
    expect(vitestConfigSrc).toMatch(/statements:\s*85/)
  })
})
