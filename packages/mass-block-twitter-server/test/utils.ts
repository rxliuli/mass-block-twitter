import { PrismaClient } from '@prisma/client'
import app from '../src'
import { afterEach, beforeEach, vi } from 'vitest'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { createExecutionContext, env } from 'cloudflare:test'
import { prismaClients } from '../src/lib/prisma'

export function initCloudflareTest() {
  let ctx: ExecutionContext
  let fetch: typeof app.request
  let prisma: PrismaClient
  beforeEach(async () => {
    const _env = env as HonoEnv['Bindings']
    await _env.MY_KV.put(
      'test-token-1',
      JSON.stringify({
        id: 'test-user-1',
        email: '1@test.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies TokenInfo),
    )
    await _env.MY_KV.put(
      'test-token-2',
      JSON.stringify({
        id: 'test-user-2',
        email: '2@test.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies TokenInfo),
    )
    await _env.DB.prepare(_env.TEST_INIT_SQL).run()
    prisma = await prismaClients.fetch(_env.DB)
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
        {
          id: 'test-user-2',
          email: '2@test.com',
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
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetch as any)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  return {
    get ctx() {
      return ctx
    },
    get fetch() {
      return fetch
    },
    get prisma() {
      return prisma
    },
    get env() {
      return env as HonoEnv['Bindings']
    },
  }
}
