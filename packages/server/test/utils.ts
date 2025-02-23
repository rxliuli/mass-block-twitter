import app from '../src'
import { afterEach, assert, beforeEach, vi } from 'vitest'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { createExecutionContext, env } from 'cloudflare:test'
import { prismaClients } from '../src/lib/prisma'
import { PrismaClient } from '@prisma/client'
import { generateToken } from '../src/middlewares/auth'
import { drizzle } from 'drizzle-orm/d1'
import { localUser } from '../src/db/schema'
import { sha256 } from '../src/lib/crypto'

export interface CloudflareTestContext {
  ctx: ExecutionContext
  fetch: typeof app.request
  prisma: PrismaClient
  token1: string
  token2: string
  env: HonoEnv['Bindings']
  db: ReturnType<typeof drizzle>
}

export async function createCloudflareTestContext(): Promise<CloudflareTestContext> {
  const _env = env as HonoEnv['Bindings']
  const token1 = await generateToken(_env, {
    sub: 'test-user-1',
  })
  const token2 = await generateToken(_env, {
    sub: 'test-user-2',
  })
  await _env.MY_KV.put(
    token1,
    JSON.stringify({
      sub: 'test-user-1',
    } satisfies TokenInfo),
  )
  await _env.MY_KV.put(
    token2,
    JSON.stringify({
      sub: 'test-user-2',
    } satisfies TokenInfo),
  )
  await _env.DB.prepare(_env.TEST_INIT_SQL).run()
  const prisma = await prismaClients.fetch(_env.DB)
  const db = drizzle(_env.DB)
  const encryptedPassword = await sha256('test')
  assert(encryptedPassword)
  await db.batch([
    db.insert(localUser).values({
      id: 'test-user-1',
      email: '1@test.com',
      password: encryptedPassword,
      emailVerified: true,
    }),
    db.insert(localUser).values({
      id: 'test-user-2',
      email: '2@test.com',
      password: encryptedPassword,
      emailVerified: true,
    }),
  ])
  const ctx = createExecutionContext()
  const fetch = ((url: string, options: RequestInit) =>
    app.request(url, options, env, ctx)) as typeof app.request
  return {
    ctx,
    fetch,
    prisma,
    token1,
    token2,
    env: _env,
    db,
  }
}

export function initCloudflareTest(): CloudflareTestContext {
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
      return context.env
    },
    get token1() {
      return context.token1
    },
    get token2() {
      return context.token2
    },
    get db() {
      return context.db
    },
  }
}
