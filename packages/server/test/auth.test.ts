import { describe, expect, it, vi } from 'vitest'
import { initCloudflareTest } from './utils'
import { generateToken } from '../src/middlewares/auth'

const context = initCloudflareTest()

it('should support bearer token', async () => {
  const resp1 = await fetch('/api/accounts/settings', {
    headers: { Authorization: context.token1 },
  })
  expect(resp1.status).eq(401)
  const resp2 = await fetch('/api/accounts/settings', {
    headers: { Authorization: `Bearer ${context.token2}` },
  })
  expect(resp2.ok).true
})

it('should support bearer token with invalid token', async () => {
  const resp = await fetch('/api/accounts/settings', {
    headers: { Authorization: 'Bearer invalid-token' },
  })
  expect(resp.status).eq(401)
})

it('should support bearer token with expired token', async () => {
  vi.useFakeTimers({
    now: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  })
  const token = await generateToken(context.env, {
    sub: 'test-user-1',
  })
  vi.useRealTimers()
  const resp = await fetch('/api/accounts/settings', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(resp.status).eq(401)
})

describe('logout', () => {
  it('should support bearer token', async () => {
    const resp1 = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${context.token1}` },
    })
    expect(resp1.ok).true
    const tokenInfo = await context.env.MY_KV.get('test-token-1')
    expect(tokenInfo).null
  })
})
