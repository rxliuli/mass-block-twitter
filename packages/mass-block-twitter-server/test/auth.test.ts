import { describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'

const context = initCloudflareTest()

it('should support bearer token', async () => {
  const resp1 = await fetch('/api/accounts/settings', {
    headers: { Authorization: 'test-token-1' },
  })
  expect(resp1.ok).true
  const resp2 = await fetch('/api/accounts/settings', {
    headers: { Authorization: 'Bearer test-token-1' },
  })
  expect(resp2.ok).true
})

describe('logout', () => {
  it('should support bearer token', async () => {
    const resp1 = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token-1' },
    })
    expect(resp1.ok).true
    const tokenInfo = await context.env.MY_KV.get('test-token-1')
    expect(tokenInfo).null
  })
})
