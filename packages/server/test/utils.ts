import app from '../src'
import { afterEach, assert, beforeEach, vi } from 'vitest'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test'
import { generateToken } from '../src/middlewares/auth'
import { localUser } from '../src/db/schema'
import { sha256 } from '../src/lib/crypto'
import { Client } from 'pg'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'

export interface CloudflareTestContext {
  ctx: ExecutionContext
  fetch: typeof app.request
  token1: string
  token2: string
  env: HonoEnv['Bindings']
  db: NodePgDatabase
  sql: Client
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
  const sql = new Client({
    connectionString: _env.HYPERDRIVE.connectionString,
  })
  await sql.connect()
  const db = drizzle(sql)
  await db.execute(_env.TEST_INIT_SQL)
  const encryptedPassword = await sha256('test')
  assert(encryptedPassword)
  await db.transaction(async (tx) => {
    await tx.insert(localUser).values({
      id: 'test-user-1',
      email: '1@test.com',
      password: encryptedPassword,
      emailVerified: true,
    })
    await tx.insert(localUser).values({
      id: 'test-user-2',
      email: '2@test.com',
      password: encryptedPassword,
      emailVerified: true,
    })
  })
  const ctx = createExecutionContext()
  const fetch = ((url: string, options: RequestInit) =>
    app.request(url, options, env, ctx)) as typeof app.request
  return {
    ctx,
    fetch,
    token1,
    token2,
    env: _env,
    db,
    sql,
  }
}

export function initCloudflareTest(): CloudflareTestContext {
  let context: CloudflareTestContext
  beforeEach(async () => {
    context = await createCloudflareTestContext()
    vi.spyOn(globalThis, 'fetch').mockImplementation(context.fetch as any)
  })
  afterEach(async () => {
    await waitOnExecutionContext(context.ctx)
    await context.sql.end()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  return {
    get ctx() {
      return context.ctx
    },
    get fetch() {
      return context.fetch
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
    get sql() {
      return context.sql
    },
  }
}
