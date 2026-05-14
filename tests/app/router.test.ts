import { describe, expect, it } from 'vitest'
import { getRouter } from '../../src/router'

describe('getRouter', () => {
  it('creates_router_from_route_tree', () => {
    const router = getRouter()
    expect(router).toBeDefined()
    expect(router.routesById).toBeDefined()
  })
})
