import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CloudflareTestContext,
  createCloudflareTestContext,
  initCloudflareTest,
} from './utils'
import { generateToken } from '../src/middlewares/auth'
import { AccountSettingsResponse, LoginResponse } from '../src/lib'

describe('token', () => {
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
})

describe('login', () => {
  let context: CloudflareTestContext
  let sendCode: string
  beforeEach(async () => {
    context = await createCloudflareTestContext()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (url === 'https://api.resend.com/emails') {
        const matched = options?.body?.toString().match(/Your code is (\d{4})/)
        expect(matched).not.null
        sendCode = matched![1]
        return new Response(JSON.stringify({ code: 'success' }), {
          status: 200,
        })
      }
      return context.fetch(url, options)
    })
  })
  it('should sign up', async () => {
    const resp1 = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test-password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const r1 = (await resp1.json()) as LoginResponse
    expect(r1.code === 'verify-email').true
    const resp2 = await fetch('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        code: sendCode,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(resp2.ok).true
    const resp3 = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test-password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(resp3.ok).true
    const r3 = (await resp3.json()) as LoginResponse
    assert(r3.code === 'success')
    expect(r3.data.email).eq('test@test.com')
  })
  it('should login with verified email', async () => {
    const resp1 = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: '1@test.com',
        password: 'test',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const r1 = (await resp1.json()) as LoginResponse
    assert(r1.code === 'success')
    expect(r1.data.email).eq('1@test.com')
    const resp2 = await fetch('/api/accounts/settings', {
      headers: { Authorization: `Bearer ${r1.data.token}` },
    })
    expect(resp2.ok).true
    const r2 = (await resp2.json()) as AccountSettingsResponse
    expect(r2.email).eq('1@test.com')
    expect(r2.isPro).false
  })
})

describe('logout', () => {
  const context = initCloudflareTest()
  it('should delete the token in logout', async () => {
    const resp1 = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${context.token1}` },
    })
    expect(resp1.ok).true
    const resp2 = await fetch('/api/accounts/settings', {
      headers: { Authorization: `Bearer ${context.token1}` },
    })
    expect(resp2.status).eq(401)
    expect(await context.env.MY_KV.get(`logout-${context.token1}`)).not
      .undefined
    vi.useFakeTimers({
      now: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    })
    // TODO https://github.com/cloudflare/workers-sdk/issues/5394
    // expect(await context.env.MY_KV.get(`logout-${context.token1}`)).undefined
    vi.useRealTimers()
  })
})
