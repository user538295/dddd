import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Home } from '../../src/routes/index'

describe('app shell', () => {
  it('renders_app_title', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', { name: 'Engineering Decision Dashboard' }),
    ).toBeInTheDocument()
  })
})
