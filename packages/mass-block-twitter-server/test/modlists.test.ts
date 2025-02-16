import { env, createExecutionContext } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src'
import { HonoEnv, TokenInfo } from '../src/lib/bindings'
import { prismaClients } from '../src/lib/prisma'
import {
  ModList,
  ModListSubscription,
  ModListUser,
  PrismaClient,
} from '@prisma/client'
import type {
  ModListUserCheckResponse,
  ModListAddTwitterUserRequest,
  ModListCreateRequest,
  ModListGetResponse,
  ModListUpdateRequest,
  ModListUsersPageResponse,
  ModListGetCreatedResponse,
  ModListSearchResponse,
  ModListSubscribeResponse,
  ModListUsersRequest,
  ModListSubscribedUserResponse,
  ModListRemoveTwitterUserRequest,
  ModListCreateResponse,
} from '../src/routes/modlists'
import { TwitterUser } from '../src/routes/twitter'

describe('modlists', () => {
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
  })
  const newModList = {
    name: 'test',
    description: 'test',
    twitterUser: {
      id: '123',
      screen_name: 'test',
      name: 'test',
    },
  } satisfies ModListCreateRequest
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      expect(r1.id).not.undefined
      const resp2 = await fetch('/api/modlists/search')
      expect(resp2.ok).true
      const r2 = (await resp2.json()) as ModListSearchResponse
      expect(r2.length).toBe(1)
      expect(r2[0].id).toBe(r1.id)
    })
    it('should be able to get created modlists', async () => {
      const getCreated = async () => {
        const resp1 = await fetch('/api/modlists/created', {
          headers: { Authorization: 'test-token-1' },
        })
        expect(resp1.ok).true
        return (await resp1.json()) as ModListGetCreatedResponse
      }
      const r1 = await getCreated()
      expect(r1.length).toBe(0)
      const resp2 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      const r2 = (await resp2.json()) as ModListCreateResponse
      expect(r2.id).not.undefined
      const r3 = await getCreated()
      expect(r3.length).toBe(1)
      expect(r3[0].id).toBe(r2.id)
    })
  })
  describe('update', () => {
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      modListId = r1.id
    })
    it('should be able to update a modlist', async () => {
      const resp1 = await fetch(`/api/modlists/update/${modListId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'test2' } satisfies ModListUpdateRequest),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = await getModList(modListId)
      expect(r1.name).toBe('test2')
    })
    it('should not be able to update a modlist that is not created by the user', async () => {
      const resp1 = await fetch(`/api/modlists/update/${modListId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'test2' } satisfies ModListUpdateRequest),
        headers: {
          Authorization: 'test-token-2',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
  })
  const remove = (id: string) =>
    fetch(`/api/modlists/remove/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'test-token-1' },
    })
  const getModList = async (id: string, token?: string) => {
    const headers = token ? { Authorization: token } : undefined
    const resp = await fetch('/api/modlists/get/' + id, { headers })
    expect(resp.ok).true
    return (await resp.json()) as ModListGetResponse
  }
  const addUserToModList = async (
    twitterUser: TwitterUser,
    modListId: string,
  ) => {
    const resp1 = await fetch('/api/modlists/user', {
      method: 'POST',
      body: JSON.stringify({
        modListId,
        twitterUser,
      } satisfies ModListAddTwitterUserRequest),
      headers: {
        Authorization: 'test-token-1',
        'Content-Type': 'application/json',
      },
    })
    expect(resp1.ok).true
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
      const r2 = (await resp2.json()) as ModListCreateResponse
      expect(r2.id).not.undefined
      const resp3 = await remove(r2.id)
      expect(resp3.ok).true
      const resp4 = await fetch('/api/modlists/search')
      expect(resp4.ok).true
      const r4 = (await resp4.json()) as ModListSearchResponse
      expect(r4.length).toBe(0)
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      expect(r1.id).not.undefined
      expect((await getModList(r1.id)).subscriptionCount).toBe(0)
      const resp2 = await fetch(`/api/modlists/subscribe/${r1.id}`, {
        method: 'POST',
        headers: { Authorization: 'test-token-2' },
      })
      expect(resp2.ok).true
      expect((await getModList(r1.id)).subscriptionCount).toBe(1)
      const resp3 = await remove(r1.id)
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      expect(r1.id).not.undefined
      const resp2 = await remove(r1.id)
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      modListId = r1.id
    })
    it('should be able to subscribe to a modlist', async () => {
      const resp2 = await fetch(`/api/modlists/subscribe/${modListId}`, {
        method: 'POST',
        headers: { Authorization: 'test-token-1' },
      })
      expect(resp2.ok).true
      const resp3 = await fetch('/api/modlists/subscribed', {
        headers: { Authorization: 'test-token-1' },
      })
      expect(resp3.ok).true
      const r3 = (await resp3.json()) as ModListSubscribeResponse
      expect(r3.length).toBe(1)
      expect(r3[0].id).toBe(modListId)
      expect((await getModList(modListId, 'test-token-1')).subscribed).true
      expect((await getModList(modListId)).subscribed).false
    })
    it('should not be able to subscribe to a modlist twice', async () => {
      const subscribe = () =>
        fetch(`/api/modlists/subscribe/${modListId}`, {
          method: 'POST',
          headers: { Authorization: 'test-token-1' },
        })
      const resp1 = await subscribe()
      expect(resp1.ok).true
      const resp2 = await subscribe()
      expect(resp2.status).toBe(400)
    })
    const getSubscribedUsers = async (force?: boolean) => {
      const resp1 = await fetch(`/api/modlists/subscribed/users`, {
        headers: { Authorization: 'test-token-1' },
      })
      expect(resp1.ok).true
      return (await resp1.json()) as ModListSubscribedUserResponse
    }
    it('should be able to get subscribed users', async () => {
      const resp1 = await fetch(`/api/modlists/subscribe/${modListId}`, {
        method: 'POST',
        headers: { Authorization: 'test-token-1' },
      })
      expect(resp1.ok).true
      expect(await getSubscribedUsers()).length(0)
      await addUserToModList(
        {
          id: 'twitter-user-1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
        },
        modListId,
      )
      expect(await getSubscribedUsers()).length(1)
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
      const r1 = (await resp1.json()) as ModListCreateResponse
      modListId = r1.id
    })
    const getModListUsers = async (modListId: string) => {
      const resp2 = await fetch('/api/modlists/users?modListId=' + modListId)
      expect(resp2.ok).true
      return (await resp2.json()) as ModListUsersPageResponse
    }
    it('should be able to add a user to a modlist', async () => {
      expect((await getModList(modListId)).userCount).toBe(0)
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
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      expect((await getModList(modListId)).userCount).toBe(1)
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
          } satisfies ModListAddTwitterUserRequest),
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
        } satisfies ModListAddTwitterUserRequest),
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
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: 'test-token-2',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
    it('should be able to check if a user is in a modlist', async () => {
      const twittrUsers: TwitterUser[] = Array.from({ length: 10 }, (_, i) => ({
        id: `123-${i}`,
        screen_name: `test-${i}`,
        name: `test-${i}`,
        profile_image_url: `test-${i}`,
        created_at: new Date().toISOString(),
      }))
      const getCheck = async () => {
        const params = new URLSearchParams()
        params.set('modListId', modListId)
        params.set('users', JSON.stringify(twittrUsers))
        const resp1 = await fetch(
          '/api/modlists/user/check?' + params.toString(),
          { headers: { Authorization: 'test-token-1' } },
        )
        expect(resp1.ok).true
        return (await resp1.json()) as ModListUserCheckResponse
      }
      const r1 = await getCheck()
      expect(Object.values(r1).every((it) => it === false)).true
      const resp2 = await fetch('/api/modlists/user', {
        method: 'POST',
        body: JSON.stringify({
          modListId,
          twitterUser: twittrUsers[0],
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const r2 = await getCheck()
      expect(r2[twittrUsers[0].id]).true
    })
    it('should be able to get modlist users with cursor', async () => {
      const list = Array.from({ length: 10 }, (_, i) => ({
        id: `123-${i}`,
        screen_name: `test-${i}`,
        name: `test-${i}`,
        profile_image_url: `test-${i}`,
        created_at: new Date().toISOString(),
      }))
      await Promise.all(list.map((it) => addUserToModList(it, modListId)))
      const getModListUsers = async (options: ModListUsersRequest) => {
        const resp2 = await fetch(
          '/api/modlists/users?' +
            new URLSearchParams(options as any).toString(),
        )
        expect(resp2.ok).true
        return (await resp2.json()) as ModListUsersPageResponse
      }
      const r1 = await getModListUsers({ modListId, limit: 1 })
      expect(r1.data).length(1)
      const r2 = await getModListUsers({
        modListId,
        limit: 10,
        cursor: r1.cursor,
      })
      expect(r2.data).length(9)
      const r3 = await getModListUsers({
        modListId,
        limit: 10,
        cursor: r2.cursor,
      })
      expect(r3.data).length(0)
    })
    it('should not be able to add a user to a modlist twice', async () => {
      await addUserToModList(
        {
          id: 'twitter-user-1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
        },
        modListId,
      )
      await expect(
        addUserToModList(
          {
            id: 'twitter-user-1',
            screen_name: 'test-user-1',
            name: 'test-user-1',
          },
          modListId,
        ),
      ).rejects.toThrow()
    })
    it('should be able to remove a user from a modlist', async () => {
      await addUserToModList(
        {
          id: 'twitter-user-1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
        },
        modListId,
      )
      expect((await getModListUsers(modListId)).data.length).toBe(1)
      const resp1 = await fetch('/api/modlists/user', {
        method: 'DELETE',
        body: JSON.stringify({
          modListId,
          twitterUserId: 'twitter-user-1',
        } satisfies ModListRemoveTwitterUserRequest),
        headers: {
          Authorization: 'test-token-1',
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      expect((await getModListUsers(modListId)).data.length).toBe(0)
    })
  })
})
