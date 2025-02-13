import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src'
import { createExecutionContext, env } from 'cloudflare:test'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { prismaClients } from '../src/lib/prisma'
import { getTokenInfo } from '../src/middlewares/auth'

let ctx: ExecutionContext
let fetch: typeof app.request
let _env: HonoEnv['Bindings']
beforeEach(async () => {
  _env = env as HonoEnv['Bindings']
  await _env.MY_KV.put(
    'test-token-1',
    JSON.stringify({
      id: 'test-user-1',
      email: '1@test.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies TokenInfo),
  )
  await _env.DB.prepare(_env.TEST_INIT_SQL).run()
  const prisma = await prismaClients.fetch(_env.DB)
  await prisma.localUser.createMany({
    data: [
      {
        id: 'test-user-1',
        email: '1@test.com',
        password: 'test',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  })
  ctx = createExecutionContext()
  fetch = ((url: string, options: RequestInit) =>
    app.request(url, options, env, ctx)) as typeof app.request
})

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
    const tokenInfo = await _env.MY_KV.get('test-token-1')
    expect(tokenInfo).null
  })
})
