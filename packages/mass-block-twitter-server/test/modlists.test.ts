import { env, createExecutionContext } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../src'
import { userSchema } from '../src/lib/request'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { prismaClients } from '../src/lib/prisma'

describe('modlists', () => {
  beforeAll(async () => {
    const _env = env as HonoEnv['Bindings']
    await _env.MY_KV.put(
      '123',
      JSON.stringify({
        id: '123',
        email: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies TokenInfo),
    )
    await _env.DB.prepare(_env.TEST_INIT_SQL).run()
    const prisma = await prismaClients.fetch(_env.DB)
    await prisma.localUser.create({
      data: {
        id: '123',
        email: 'test',
        password: 'test',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  })
  it('should be able to create a modlist', async () => {
    const ctx = createExecutionContext()
    const resp = await app.request(
      '/api/modlists/create',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          description: 'test',
          twitterUser: {
            id: '123',
            screen_name: 'test',
            name: 'test',
          } satisfies typeof userSchema._type,
        }),
        headers: {
          Authorization: '123',
          'Content-Type': 'application/json',
        },
      },
      env,
      ctx,
    )
    expect(resp.ok).true
  })
})
