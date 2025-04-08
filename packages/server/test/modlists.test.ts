import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  ModListSubscribedUserAndRulesResponse,
  ModListRemoveTwitterUserRequest,
  ModListCreateResponse,
  ModListUserCheckPostRequest,
  ModListSubscribeRequest,
  ModListAddRuleResponse,
  ModListAddRuleRequest,
  ModListUpdateRuleRequest,
  ModListRulesPageResponse,
  ModListRulesRequest,
  ModListUpdateRuleResponse,
  ModListAddTwitterUsersRequest,
  ModListAddTwitterUsersResponse,
  ModListIdsResponse,
} from '../src/lib'
import { TwitterUser } from '../src/routes/twitter'
import { initCloudflareTest } from './utils'
import {
  modList,
  modListSubscription,
  modListUser,
  user,
} from '../src/db/schema'
import { eq, InferInsertModel } from 'drizzle-orm'
import { range } from 'es-toolkit'

describe('modlists', () => {
  const context = initCloudflareTest()
  const newModList = {
    name: 'test',
    description: 'test',
    twitterUser: {
      id: '123',
      screen_name: 'test',
      name: 'test',
      created_at: new Date().toISOString(),
      is_blue_verified: false,
      followers_count: 100,
      friends_count: 100,
      default_profile: false,
      default_profile_image: false,
    },
  } satisfies ModListCreateRequest
  describe('create', () => {
    it('should be able to create a modlist', async () => {
      const db = context.db
      expect(await db.select().from(modListSubscription).all()).length(0)
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
    it('should be able to create a modlist insert user new fields', async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newModList,
          twitterUser: {
            ...newModList.twitterUser,
            is_blue_verified: true,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          },
        } satisfies ModListCreateRequest),
      })
      expect(resp1.ok).true
      const users = await context.db.select().from(user).all()
      expect(users).length(1)
      expect(users[0].blueVerified).toBe(true)
      expect(users[0].followersCount).toBe(100)
      expect(users[0].followingCount).toBe(100)
      expect(users[0].defaultProfile).toBe(false)
      expect(users[0].defaultProfileImage).toBe(false)
    })
    it('should be able to get created modlists', async () => {
      const getCreated = async () => {
        const resp1 = await fetch('/api/modlists/created', {
          headers: { Authorization: `Bearer ${context.token1}` },
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
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      const r2 = (await resp2.json()) as ModListCreateResponse
      expect(r2.id).not.undefined
      const r3 = await getCreated()
      expect(r3.length).toBe(1)
      expect(r3[0].id).toBe(r2.id)
    })
    it('create a protected modlist', async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify({
          ...newModList,
          visibility: 'protected',
        } satisfies ModListCreateRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListCreateResponse
      expect((await getModList(r1.id)).visibility).toBe('protected')
      const r2 = (await (
        await fetch('/api/modlists/search')
      ).json()) as ModListSearchResponse
      expect(r2).length(0)
      const resp3 = await fetch('/api/modlists/update/' + r1.id, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'test2',
          visibility: 'public',
        } satisfies ModListUpdateRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp3.ok).true
      expect((await getModList(r1.id)).visibility).toBe('public')
      const r4 = (await (
        await fetch('/api/modlists/search')
      ).json()) as ModListSearchResponse
      expect(r4.length).toBe(1)
      expect(r4[0].id).toBe(r1.id)
    })
  })
  describe('update', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = await getModList(modListId)
      expect(r1.name).toBe('test2')
    })
    it("should not be able to update other user's modlist", async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListCreateResponse
      const modListId2 = r1.id
      const resp2 = await fetch(`/api/modlists/update/${modListId2}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'test2' } satisfies ModListUpdateRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const r2 = await getModList(modListId2)
      expect(r2.name).toBe('test2')
      const r3 = await getModList(modListId)
      expect(r3.name).toBe('test')
    })
    it('should not be able to update a modlist that is not created by the user', async () => {
      const resp1 = await fetch(`/api/modlists/update/${modListId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'test2' } satisfies ModListUpdateRequest),
        headers: {
          Authorization: `Bearer ${context.token2}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
  })
  const remove = (id: string) =>
    fetch(`/api/modlists/remove/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${context.token1}` },
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
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp1.ok).true
  }
  const removeUserFromModList = async (
    twitterUserId: string,
    modListId: string,
  ) => {
    const resp1 = await fetch('/api/modlists/user', {
      method: 'DELETE',
      body: JSON.stringify({
        modListId,
        twitterUserId,
      } satisfies ModListRemoveTwitterUserRequest),
      headers: {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp1.ok).true
  }
  const unsubscribe = (modListId: string) =>
    fetch(`/api/modlists/subscribe/${modListId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${context.token1}` },
    })
  describe('remove', () => {
    it('should be able to remove a modlist', async () => {
      const resp1 = await remove('123')
      expect(resp1.status).toBe(404)
      const resp2 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListCreateResponse
      expect(r1.id).not.undefined
      expect((await getModList(r1.id)).subscriptionCount).toBe(0)
      const resp2 = await fetch(`/api/modlists/subscribe/${r1.id}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'hide',
        } satisfies ModListSubscribeRequest),
        headers: {
          Authorization: `Bearer ${context.token2}`,
          'Content-Type': 'application/json',
        },
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
          Authorization: `Bearer ${context.token2}`,
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
  const getSubscribedUsers = async (options?: { token?: string }) => {
    const resp1 = await fetch(`/api/modlists/subscribed/users`, {
      headers: { Authorization: `Bearer ${options?.token ?? context.token1}` },
    })
    expect(resp1.ok).true
    return (await resp1.json()) as ModListSubscribedUserAndRulesResponse
  }
  describe('subscribe', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListCreateResponse
      modListId = r1.id
    })
    const subscribeModList = async (optinos?: {
      modListId?: string
      token?: string
      action?: ModListSubscribeRequest['action']
    }) => {
      const resp = await fetch(
        `/api/modlists/subscribe/${optinos?.modListId ?? modListId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${optinos?.token ?? context.token1}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: optinos?.action ?? 'hide',
          } satisfies ModListSubscribeRequest),
        },
      )
      expect(resp.ok).true
    }
    it('should be able to subscribe to a modlist', async () => {
      await subscribeModList()
      const resp3 = await fetch('/api/modlists/subscribed/metadata', {
        headers: { Authorization: `Bearer ${context.token1}` },
      })
      expect(resp3.ok).true
      const r3 = (await resp3.json()) as ModListSubscribeResponse
      expect(r3.length).toBe(1)
      expect(r3[0].id).toBe(modListId)
      expect(
        (await getModList(modListId, `Bearer ${context.token1}`)).subscribed,
      ).true
      expect((await getModList(modListId)).subscribed).false
    })
    it('should duplicate subscribe to a modlist', async () => {
      await subscribeModList()
      await subscribeModList()
    })
    it('should be able to get subscribed users', async () => {
      await subscribeModList()
      expect(await getSubscribedUsers()).length(0)
      await addUserToModList(
        {
          id: '123',
          screen_name: 'test-user-1',
          name: 'test-user-1',
          created_at: new Date().toISOString(),
          is_blue_verified: false,
          followers_count: 100,
          friends_count: 100,
          default_profile: false,
          default_profile_image: false,
        },
        modListId,
      )
      expect(await getSubscribedUsers()).length(1)
      expect((await getSubscribedUsers())[0].twitterUserIds).toEqual(['123'])
    })
    it('should be able to subscribe to a modlist with block action', async () => {
      const resp1 = await fetch(`/api/modlists/subscribe/${modListId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'block',
        } satisfies ModListSubscribeRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      await addUserToModList(
        {
          id: '123',
          screen_name: 'test-user-1',
          name: 'test-user-1',
          created_at: new Date().toISOString(),
          is_blue_verified: false,
          followers_count: 100,
          friends_count: 100,
          default_profile: false,
          default_profile_image: false,
        },
        modListId,
      )
      expect(await getSubscribedUsers()).toEqual([
        {
          modListId,
          action: 'block',
          twitterUserIds: ['123'],
          rules: [],
        },
      ] satisfies ModListSubscribedUserAndRulesResponse)
    })
    describe('should be able to subscribe to get modlist uesrs/rules with cache', async () => {
      beforeEach(async () => {
        const users = range(10)
          .map((i) => i + 1)
          .map(
            (it) =>
              ({
                id: `${it}`,
                screenName: `test-user-${it}`,
                name: `test-user-${it}`,
                profileImageUrl: `test-user-${it}`,
                accountCreatedAt: new Date().toISOString(),
              } satisfies InferInsertModel<typeof user>),
          )
        const db = context.db
        await db.insert(user).values(users)
        await subscribeModList()
        await db.insert(modListUser).values({
          id: 'modlist-user-1',
          modListId,
          twitterUserId: '1',
        })
      })
      it('update modlist updatedAt column', async () => {
        const db = context.db
        const r1 = await getSubscribedUsers()
        await db.insert(modListUser).values({
          id: 'modlist-user-2',
          modListId,
          twitterUserId: '2',
        })
        const r2 = await getSubscribedUsers()
        expect(r1).toEqual(r2)
        await db
          .update(modList)
          .set({
            updatedAt: new Date().toISOString(),
          })
          .where(eq(modList.id, modListId))
        const r3 = await getSubscribedUsers()
        expect(r1).not.toEqual(r3)
      })
      it('should be able to clear cache when update modlist metadata', async () => {
        const db = context.db
        const r1 = await getSubscribedUsers()
        await db.insert(modListUser).values({
          id: 'modlist-user-2',
          modListId,
          twitterUserId: '2',
        })
        const r2 = await getSubscribedUsers()
        expect(r1).toEqual(r2)
        const resp3 = await fetch('/api/modlists/update/' + modListId, {
          method: 'PUT',
          body: JSON.stringify({
            visibility: 'public',
          } satisfies ModListUpdateRequest),
          headers: {
            Authorization: `Bearer ${context.token1}`,
            'Content-Type': 'application/json',
          },
        })
        expect(resp3.ok).true
        const r3 = await getSubscribedUsers()
        expect(r1).not.toEqual(r3)
      })
      it('should be able to clear cache when add or remove modlistUsers', async () => {
        const db = context.db
        const r1 = await getSubscribedUsers()
        await addUserToModList(
          {
            id: '2',
            screen_name: 'test-user-2',
            name: 'test-user-2',
          },
          modListId,
        )
        const r2 = await getSubscribedUsers()
        expect(r2).not.toEqual(r1)
        await removeUserFromModList('2', modListId)
        const r3 = await getSubscribedUsers()
        expect(r3).not.toEqual(r2)
        expect(r3).toEqual(r1)
      })
      it('should be able to clear cache when add or remove modlistRules', async () => {
        const r1 = await getSubscribedUsers()
        const rule = await addRule(
          {
            or: [
              {
                and: [{ value: 'test-rule-1', field: 'rule', operator: 'eq' }],
              },
            ],
          },
          modListId,
        )
        const r2 = await getSubscribedUsers()
        expect(r2).not.toEqual(r1)
        await updateRule({
          id: rule.id,
          rule: {
            or: [
              {
                and: [{ value: 'test-rule-2', field: 'rule', operator: 'eq' }],
              },
            ],
          },
          name: 'test-rule-1',
        })
        const r3 = await getSubscribedUsers()
        expect(r3).not.toEqual(r2)
        await removeRule(rule.id)
        const r4 = await getSubscribedUsers()
        expect(r4).not.toEqual(r3)
        expect(r4).toEqual(r1)
      })
      it('should be able to subscribe to get modlist uesrs/rules with cache', async () => {
        await subscribeModList({
          token: context.token1,
          action: 'block',
        })
        const r1 = await getSubscribedUsers({ token: context.token1 })
        expect(r1[0].action).eq('block')
        await subscribeModList({ token: context.token2, action: 'hide' })
        const r2 = await getSubscribedUsers({ token: context.token2 })
        expect(r2[0].action).eq('hide')
      })
    })
  })
  describe('user', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
            is_blue_verified: false,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          },
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
              is_blue_verified: false,
              followers_count: 100,
              friends_count: 100,
              default_profile: false,
              default_profile_image: false,
            },
          } satisfies ModListAddTwitterUserRequest),
          headers: {
            Authorization: `Bearer ${context.token1}`,
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
            is_blue_verified: false,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          },
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
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
            is_blue_verified: false,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          },
        } satisfies ModListAddTwitterUserRequest),
        headers: {
          Authorization: `Bearer ${context.token2}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
    it('should be able to check if a user is in a modlist', async () => {
      const twittrUsers: TwitterUser[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        screen_name: `test-${i}`,
        name: `test-${i}`,
        profile_image_url: `test-${i}`,
        created_at: new Date().toISOString(),
        is_blue_verified: false,
        followers_count: 100,
        friends_count: 100,
        default_profile: false,
        default_profile_image: false,
      }))
      const getCheck = async () => {
        const resp1 = await fetch('/api/modlists/user/check', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.token1}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modListId,
            users: twittrUsers,
          } satisfies ModListUserCheckPostRequest),
        })
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
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const r2 = await getCheck()
      expect(r2[twittrUsers[0].id]).true
    })
    it('should be able to get modlist users with cursor', async () => {
      const list = Array.from(
        { length: 10 },
        (_, i) =>
          ({
            id: `${i}`,
            screen_name: `test-${i}`,
            name: `test-${i}`,
            profile_image_url: `test-${i}`,
            created_at: new Date().toISOString(),
            is_blue_verified: false,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          } satisfies TwitterUser),
      )
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
          id: '1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
          created_at: new Date().toISOString(),
          is_blue_verified: false,
          followers_count: 100,
          friends_count: 100,
          default_profile: false,
          default_profile_image: false,
        },
        modListId,
      )
      await expect(
        addUserToModList(
          {
            id: '1',
            screen_name: 'test-user-1',
            name: 'test-user-1',
            created_at: new Date().toISOString(),
            is_blue_verified: false,
            followers_count: 100,
            friends_count: 100,
            default_profile: false,
            default_profile_image: false,
          },
          modListId,
        ),
      ).rejects.toThrow()
    })
    it('should be able to remove a user from a modlist', async () => {
      await addUserToModList(
        {
          id: '1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
          created_at: new Date().toISOString(),
          is_blue_verified: false,
          followers_count: 100,
          friends_count: 100,
          default_profile: false,
          default_profile_image: false,
        },
        modListId,
      )
      expect((await getModListUsers(modListId)).data.length).toBe(1)
      const resp1 = await fetch('/api/modlists/user', {
        method: 'DELETE',
        body: JSON.stringify({
          modListId,
          twitterUserId: '1',
        } satisfies ModListRemoveTwitterUserRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      expect((await getModListUsers(modListId)).data.length).toBe(0)
    })
    it('should be able to add multiple users to a modlist', async () => {
      const db = context.db
      await db.insert(user).values({
        id: '1',
        screenName: 'test-user-1',
        name: 'test-user-1',
        profileImageUrl: 'test-user-1',
        accountCreatedAt: new Date().toISOString(),
      })
      await db.insert(modListUser).values({
        id: 'modlist-user-1',
        modListId,
        twitterUserId: '1',
      })
      const req = async () => {
        const resp1 = await fetch('/api/modlists/users', {
          method: 'POST',
          body: JSON.stringify({
            modListId,
            twitterUsers: [
              {
                id: '1',
                screen_name: 'test-user-1',
                name: 'test-user-1',
                profile_image_url: 'test-user-1',
                created_at: new Date().toISOString(),
              },
              {
                id: '2',
                screen_name: 'test-user-2',
                name: 'test-user-2',
                profile_image_url: 'test-user-2',
                created_at: new Date().toISOString(),
              },
            ],
          } satisfies ModListAddTwitterUsersRequest),
          headers: {
            Authorization: `Bearer ${context.token1}`,
            'Content-Type': 'application/json',
          },
        })
        expect(resp1.ok).true
        return (await resp1.json()) as ModListAddTwitterUsersResponse
      }
      const r1 = await req()
      expect(r1.length).toBe(2)
      expect(r1[0].id).toBe('1')
      expect(r1[1].id).toBe('2')
      const r2 = await req()
      expect(r2.length).toBe(2)
      expect(r2[0].id).toBe('1')
      expect(r2[1].id).toBe('2')
    })
    it('should be able to get ids', async () => {
      await addUserToModList(
        {
          id: '1',
          screen_name: 'test-user-1',
          name: 'test-user-1',
          created_at: new Date().toISOString(),
          is_blue_verified: false,
          followers_count: 100,
          friends_count: 100,
          default_profile: false,
          default_profile_image: false,
        },
        modListId,
      )
      const resp1 = await fetch(`/api/modlists/ids/${modListId}`)
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListIdsResponse
      expect(r1.twitterUserIds).length(1)
      expect(r1.twitterUserIds[0]).toBe('1')
    })
  })

  async function addRule(
    rule: ModListAddRuleRequest['rule'],
    modListId: string,
  ) {
    const resp1 = await fetch('/api/modlists/rule', {
      method: 'POST',
      body: JSON.stringify({
        modListId,
        name: 'test',
        rule,
      } satisfies ModListAddRuleRequest),
      headers: {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp1.ok).true
    return (await resp1.json()) as ModListAddRuleResponse
  }
  async function removeRule(id: string) {
    const resp1 = await fetch(`/api/modlists/rule/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${context.token1}`,
      },
    })
    expect(resp1.ok).true
  }
  async function updateRule(options: {
    id: string
    rule: ModListUpdateRuleRequest['rule']
    token?: string
    name: string
  }) {
    const resp1 = await fetch(`/api/modlists/rule/${options.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: options.name,
        rule: options.rule,
      } satisfies ModListUpdateRuleRequest),
      headers: {
        Authorization: `Bearer ${options.token ?? context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp1.ok).true
    return (await resp1.json()) as ModListUpdateRuleResponse
  }
  describe('rule', () => {
    let modListId: string
    beforeEach(async () => {
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify(newModList),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as ModListCreateResponse
      modListId = r1.id
    })
    async function getRules(options: ModListRulesRequest) {
      const resp1 = await fetch(
        '/api/modlists/rules?' + new URLSearchParams(options as any).toString(),
      )
      expect(resp1.ok).true
      return (await resp1.json()) as ModListRulesPageResponse
    }
    it('should be able to add a rule to a modlist', async () => {
      expect(await getSubscribedUsers()).length(0)
      const r1 = await addRule(
        {
          or: [
            {
              and: [{ field: 'user.name', operator: 'inc', value: '100' }],
            },
          ],
        },
        modListId,
      )
      expect(r1.id).not.undefined
      const resp2 = await fetch(`/api/modlists/subscribe/${modListId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'block',
        } satisfies ModListSubscribeRequest),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const r2 = await getSubscribedUsers()
      expect(r2).length(1)
      expect(r2[0].action).eq('block')
      expect(r2[0].rules).length(1)
      expect(r2[0].rules[0]).toEqual(r1.rule)
    })
    it('should be able to update a rule', async () => {
      const r1 = await addRule(
        {
          or: [
            {
              and: [
                { field: 'user.followers_count', operator: 'eq', value: 0 },
              ],
            },
          ],
        },
        modListId,
      )
      const r2 = await updateRule({
        id: r1.id,
        name: 'test2',
        rule: {
          or: [
            {
              and: [
                { field: 'user.followers_count', operator: 'lt', value: 10 },
              ],
            },
          ],
        },
      })
      expect(r2.id).toEqual(r1.id)
      expect(r2.name).toEqual('test2')
      expect(r2.rule).toEqual({
        or: [
          {
            and: [{ field: 'user.followers_count', operator: 'lt', value: 10 }],
          },
        ],
      } satisfies ModListUpdateRuleResponse['rule'])
    })
    it('should not be able to update a rule that does not exist', async () => {
      const resp1 = await fetch(`/api/modlists/rule/123`, {
        method: 'PUT',
        body: JSON.stringify({
          id: '123',
          name: 'test',
          rule: {
            or: [
              {
                and: [
                  { field: 'user.followers_count', operator: 'lt', value: 10 },
                ],
              },
            ],
          },
        }),
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
    it('should not be able to update a rule that is not created by the user', async () => {
      const r1 = await addRule(
        {
          or: [
            { and: [{ field: 'user.name', operator: 'inc', value: '100' }] },
          ],
        },
        modListId,
      )
      const resp1 = await fetch(`/api/modlists/rule/${r1.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'test',
          rule: {
            or: [
              {
                and: [
                  { field: 'user.followers_count', operator: 'lt', value: 10 },
                ],
              },
            ],
          },
        }),
        headers: {
          Authorization: `Bearer ${context.token2}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp1.status).toBe(404)
    })
    it('should be able to remove a rule from a modlist', async () => {
      const r1 = await addRule(
        {
          or: [
            { and: [{ field: 'user.name', operator: 'inc', value: '100' }] },
          ],
        },
        modListId,
      )
      const l1 = await getRules({ modListId })
      expect(l1.data).length(1)
      expect(l1.data[0]).toEqual(r1)
      const resp2 = await fetch(`/api/modlists/rule/${r1.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${context.token1}`,
          'Content-Type': 'application/json',
        },
      })
      expect(resp2.ok).true
      const l2 = await getRules({ modListId })
      expect(l2.cursor).undefined
      expect(l2.data).length(0)
    })
    it('should not be able to remove a rule that does not exist', async () => {
      const resp1 = await fetch(`/api/modlists/rule/123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${context.token1}` },
      })
      expect(resp1.status).toBe(404)
    })
    it('should not be able to remove a rule that is not created by the user', async () => {
      const r1 = await addRule(
        {
          or: [
            { and: [{ field: 'user.name', operator: 'inc', value: '100' }] },
          ],
        },
        modListId,
      )
      const resp1 = await fetch(`/api/modlists/rule/${r1.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${context.token2}` },
      })
      expect(resp1.status).toBe(404)
    })
    it('should be able to get rules with cursor', async () => {
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => i).map((it) =>
          addRule(
            {
              or: [
                {
                  and: [
                    {
                      field: 'user.followers_count',
                      operator: 'eq',
                      value: 0,
                    },
                  ],
                },
              ],
            },
            modListId,
          ),
        ),
      )
      const r1 = await getRules({ modListId, limit: 1 })
      expect(r1.cursor).not.undefined
      expect(r1.data).length(1)
      const r2 = await getRules({ modListId, cursor: r1.cursor, limit: 9 })
      expect(r2.data).length(9)
      const r3 = await getRules({ modListId, cursor: r2.cursor, limit: 1 })
      expect(r3.data).length(0)
      const r4 = await getRules({ modListId, limit: 10, cursor: r1.cursor })
      expect(r4.cursor).undefined
      expect(r4.data).length(9)
    })
    it('should be able remove modlist', async () => {
      await addRule(
        {
          or: [
            {
              and: [{ field: 'user.name', operator: 'inc', value: '100' }],
            },
          ],
        },
        modListId,
      )
      expect((await remove(modListId)).ok).true
      const r1 = await getRules({ modListId })
      expect(r1.data).length(0)
    })
  })

  describe('search with query filter', () => {
    it('should filter modlists based on user name', async () => {
      const headers = {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      }
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify({ ...newModList }),
        headers,
      })
      expect(resp1.ok).true
      const modListId = ((await resp1.json()) as any).id

      await addUserToModList(
        { ...newModList.twitterUser, name: 'Unique Filter Test' },
        modListId,
      )
      await addUserToModList(
        { ...newModList.twitterUser, id: '1234', name: 'Unique Filter Test' },
        modListId,
      )

      const searchResp = await fetch(
        `/api/modlists/users?modListId=${modListId}&query=unique%20filter`,
        { headers },
      )
      expect(searchResp.ok).true
      const searchResults =
        (await searchResp.json()) as ModListUsersPageResponse
      expect(searchResults.data.length).toBe(1)
    })
    it('should filter modlist sorted by updated', async () => {
      vi.useFakeTimers()
      let now = new Date()
      const next = () => {
        now = new Date(now.getTime() + 100)
        vi.setSystemTime(now)
      }
      const headers = {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      }
      const resp1 = await fetch('/api/modlists/create', {
        method: 'POST',
        body: JSON.stringify({ ...newModList }),
        headers,
      })
      expect(resp1.ok).true
      const modListId = ((await resp1.json()) as ModListCreateResponse).id
      const modList1 = await getModList(modListId)
      let lastUpdatedAt = modList1.updatedAt
      next()
      await addUserToModList(
        { ...newModList.twitterUser, id: '1234' },
        modListId,
      )
      const modList2 = await getModList(modListId)
      expect(modList2.updatedAt).not.eq(lastUpdatedAt)
      lastUpdatedAt = modList2.updatedAt
      next()
      const resp3 = await fetch('/api/modlists/update/' + modListId, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'test2',
          visibility: 'public',
        } satisfies ModListUpdateRequest),
        headers,
      })
      const modList3 = await getModList(modListId)
      expect(modList3.updatedAt).not.eq(lastUpdatedAt)
      lastUpdatedAt = modList3.updatedAt
      next()
      const rule1 = await addRule(
        {
          or: [
            { and: [{ field: 'user.name', operator: 'inc', value: '100' }] },
          ],
        },
        modListId,
      )
      const modList4 = await getModList(modListId)
      expect(modList4.updatedAt).not.eq(lastUpdatedAt)
      lastUpdatedAt = modList4.updatedAt
      next()
      await updateRule({
        id: rule1.id,
        name: 'test3',
        rule: {
          or: [
            { and: [{ field: 'user.name', operator: 'inc', value: '100' }] },
          ],
        },
      })
      const modList5 = await getModList(modListId)
      expect(modList5.updatedAt).not.eq(lastUpdatedAt)
      lastUpdatedAt = modList5.updatedAt
      next()
      await fetch(`/api/modlists/rule/${rule1.id}`, {
        method: 'DELETE',
        headers,
      })
      const modList6 = await getModList(modListId)
      expect(modList6.updatedAt).not.eq(lastUpdatedAt)
      lastUpdatedAt = modList6.updatedAt
      vi.useRealTimers()
    })
  })
})
