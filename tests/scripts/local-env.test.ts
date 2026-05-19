import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearE2eRefreshStubUnlessAllowed } from '../../scripts/local-env'

describe('local env guards', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('clears_leaked_e2e_refresh_stub_for_normal_local_commands', () => {
    vi.stubEnv('DASHBOARD_E2E_REFRESH_STUB', '1')
    vi.stubEnv('DASHBOARD_ALLOW_E2E_REFRESH_STUB', '')

    clearE2eRefreshStubUnlessAllowed()

    expect(process.env.DASHBOARD_E2E_REFRESH_STUB).toBeUndefined()
  })

  it('keeps_e2e_refresh_stub_when_script_explicitly_allows_it', () => {
    vi.stubEnv('DASHBOARD_E2E_REFRESH_STUB', '1')
    vi.stubEnv('DASHBOARD_ALLOW_E2E_REFRESH_STUB', '1')

    clearE2eRefreshStubUnlessAllowed()

    expect(process.env.DASHBOARD_E2E_REFRESH_STUB).toBe('1')
  })
})
