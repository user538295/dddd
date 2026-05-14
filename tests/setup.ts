import '@testing-library/jest-dom/vitest'
import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  window.scrollTo = vi.fn() as typeof window.scrollTo
})
