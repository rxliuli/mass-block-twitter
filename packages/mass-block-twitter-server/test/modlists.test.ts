import { env, createExecutionContext } from 'cloudflare:test'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import app from '../src'
import { userSchema } from '../src/lib/request'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { prismaClients } from '../src/lib/prisma'
import { ModList, ModListSubscription, ModListUser } from '@prisma/client'
import {
  addTwitterUserSchema,
  createSchema,
  removeSchema,
  subscribeSchema,
} from '../src/routes/modlists'

describe('modlists', () => {
  let ctx: ExecutionContext
  let fetch: typeof app.request
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
  })
  const newModList = {
    name: 'test',
    description: 'test',
    twitterUser: {
      id: '123',
      screen_name: 'test',
      name: 'test',
    },
  } satisfies typeof createSchema._type
  describe('create', () => {
    it('should be able to create a modlist', async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as { code: 'success'; data: ModList }
      expect(r1.data.id).not.undefined
      const resp2 = await fetch('/api/modlists/search')
      expect(resp2.ok).true
      const r2 = (await resp2.json()) as { code: 'success'; data: ModList[] }
      expect(r2.data.length).toBe(1)
      expect(r2.data[0].id).toBe(r1.data.id)
    })
    it('should be able to get created modlists', async () => {
      const getCreated = async () => {
        const resp1 = await fetch('/api/modlists/created', {
          headers: { Authorization: 'test-token-1' },
        })
        expect(resp1.ok).true
        return (await resp1.json()) as { code: 'success'; data: ModList[] }
      }
      const r1 = await getCreated()
      expect(r1.data.length).toBe(0)
      const resp2 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      const r2 = (await resp2.json()) as { code: 'success'; data: ModList }
      expect(r2.data.id).not.undefined
      const r3 = await getCreated()
      expect(r3.data.length).toBe(1)
      expect(r3.data[0].id).toBe(r2.data.id)
    })
  })
  const remove = (id: string) =>
    fetch('/api/modlists/remove', {
      method: 'DELETE',
      body: JSON.stringify({ id } as typeof removeSchema._type),
      headers: {
        Authorization: 'test-token-1',
        'Content-Type': 'application/json',
      },
    })
  const getModList = async (id: string, token?: string) => {
    const headers = token ? { Authorization: token } : undefined
    const resp = await fetch('/api/modlists/get/' + id, { headers })
    expect(resp.ok).true
    return (await resp.json()) as {
      code: 'success'
      data: ModList & {
        subscribed: boolean
      }
    }
  }
  describe('remove', () => {
    it('should be able to remove a modlist', async () => {
      const resp1 = await remove('123')
      expect(resp1.status).toBe(404)
      const resp2 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const r2 = (await resp2.json()) as { code: 'success'; data: ModList }
      expect(r2.data.id).not.undefined
      const resp3 = await remove(r2.data.id)
      expect(resp3.ok).true
      const resp4 = await fetch('/api/modlists/search')
      expect(resp4.ok).true
      const r4 = (await resp4.json()) as { code: 'success'; data: ModList[] }
      expect(r4.data.length).toBe(0)
    })
    it('should be able to remove a modlist with subscriptions', async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as { code: 'success'; data: ModList }
      expect(r1.data.id).not.undefined
      expect((await getModList(r1.data.id)).data.subscriptionCount).toBe(0)
      const resp2 = await fetch('/api/modlists/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          id: r1.data.id,
        } satisfies typeof subscribeSchema._type),
        headers: {
          Authorization: 'test-token-2',
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      expect((await getModList(r1.data.id)).data.subscriptionCount).toBe(1)
      const resp3 = await remove(r1.data.id)
      expect(resp3.ok).false
      expect(resp3.status).toBe(400)
    })
    it("should be able to remove other user's modlist", async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-2',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as { code: 'success'; data: ModList }
      expect(r1.data.id).not.undefined
      const resp2 = await remove(r1.data.id)
      expect(resp2.ok).false
      expect(resp2.status).toBe(404)
    })
  })
  describe('subscribe', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as { code: 'success'; data: ModList }
      modListId = r1.data.id
    })
    it('should be able to subscribe to a modlist', async () => {
      const resp2 = await fetch('/api/modlists/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          id: modListId,
        } satisfies typeof subscribeSchema._type),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const resp3 = await fetch('/api/modlists/subscribed', {
        headers: { Authorization: 'test-token-1' },
      })
      expect(resp3.ok).true
      const r3 = (await resp3.json()) as {
        code: 'success'
        data: ModListSubscription[]
      }
      expect(r3.data.length).toBe(1)
      expect(r3.data[0].modListId).toBe(modListId)
      expect((await getModList(modListId, 'test-token-1')).data.subscribed).true
      expect((await getModList(modListId)).data.subscribed).false
    })
    it('should not be able to subscribe to a modlist twice', async () => {
      const subscribe = () =>
        fetch('/api/modlists/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            id: modListId,
          } satisfies typeof subscribeSchema._type),
          headers: {
            Authorization: 'test-token-1',
            'Content-Type': 'application/json',
          },
        })
      const resp1 = await subscribe()
      expect(resp1.ok).true
      const resp2 = await subscribe()
      expect(resp2.status).toBe(400)
    })
  })
  describe('user', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as { code: 'success'; data: ModList }
      modListId = r1.data.id
    })
    it('should be able to add a user to a modlist', async () => {
      const getModListUsers = async (modListId: string) => {
        const resp2 = await fetch('/api/modlists/users?id=' + modListId)
        expect(resp2.ok).true
        return (await resp2.json()) as {
          code: 'success'
          data: ModListUser[]
        }
      }
      expect((await getModList(modListId)).data.userCount).toBe(0)
      expect((await getModListUsers(modListId)).data.length).toBe(0)
      const resp1 = await fetch('/api/modlists/user', {
        method: 'POST',
        body: JSON.stringify({
          modListId,
          twitterUser: {
            id: '123',
            screen_name: 'test',
            name: 'test',
            profile_image_url: 'test',
            created_at: new Date().toISOString(),
          },
        } satisfies typeof addTwitterUserSchema._type),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      expect((await getModList(modListId)).data.userCount).toBe(1)
      expect((await getModListUsers(modListId)).data.length).toBe(1)
    })
    it('should not be able to add a user to a modlist twice', async () => {
      const add = () =>
        fetch('/api/modlists/user', {
          method: 'POST',
          body: JSON.stringify({
            modListId,
            twitterUser: {
              id: '123',
              screen_name: 'test',
              name: 'test',
              profile_image_url: 'test',
              created_at: new Date().toISOString(),
            },
          } satisfies typeof addTwitterUserSchema._type),
          headers: {
            Authorization: 'test-token-1',
            'Content-Type': 'application/json',
          },
        })
      const resp1 = await add()
      expect(resp1.ok).true
      const resp2 = await add()
      expect(resp2.status).toBe(400)
    })
    it('should not be able to add a user to a modlist that does not exist', async () => {
      const resp1 = await fetch('/api/modlists/user', {
        method: 'POST',
        body: JSON.stringify({
          modListId: '123',
          twitterUser: {
            id: '123',
            screen_name: 'test',
            name: 'test',
            profile_image_url: 'test',
            created_at: new Date().toISOString(),
          },
        } satisfies typeof addTwitterUserSchema._type),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
    it('should not be able to add a user to a modlist that is not created by the user', async () => {
      const resp1 = await fetch('/api/modlists/user', {
        method: 'POST',
        body: JSON.stringify({
          modListId: '123',
          twitterUser: {
            id: '123',
            screen_name: 'test',
            name: 'test',
            profile_image_url: 'test',
            created_at: new Date().toISOString(),
          },
        } satisfies typeof addTwitterUserSchema._type),
        headers: {
          Authorization: 'test-token-2',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
  })
})
