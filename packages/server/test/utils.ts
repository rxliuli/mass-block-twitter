import app from '../src'
import { afterEach, beforeEach, vi } from 'vitest'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { createExecutionContext, env } from 'cloudflare:test'
import { prismaClients } from '../src/lib/prisma'
import { PrismaClient } from '@prisma/client'

export interface CloudflareTestContext {
  ctx: ExecutionContext
  fetch: typeof app.request
  prisma: PrismaClient
}

export async function createCloudflareTestContext(): Promise<CloudflareTestContext> {
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
  const prisma = await prismaClients.fetch(_env.DB)
  await prisma.localUser.create({
    data: {
      id: 'test-user-1',
      email: '1@test.com',
      password: 'test',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  await prisma.localUser.create({
    data: {
      id: 'test-user-2',
      email: '2@test.com',
      password: 'test',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  const ctx = createExecutionContext()
  const fetch = ((url: string, options: RequestInit) =>
    app.request(url, options, env, ctx)) as typeof app.request
  return {
    ctx,
    fetch,
    prisma,
  }
}

export function initCloudflareTest() {
  let context: CloudflareTestContext
  beforeEach(async () => {
    context = await createCloudflareTestContext()
    vi.spyOn(globalThis, 'fetch').mockImplementation(context.fetch as any)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  return {
    get ctx() {
      return context.ctx
    },
    get fetch() {
      return context.fetch
    },
    get prisma() {
      return context.prisma
    },
    get env() {
      return env as HonoEnv['Bindings']
    },
  }
}
