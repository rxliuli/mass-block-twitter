import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ulid } from 'ulidx'
import { userSchema } from '../lib/request'
import { auth, getTokenInfo } from '../middlewares/auth'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1'
import {
  modList,
  modListRule,
  modListSubscription,
  modListUser,
  user,
} from '../db/schema'
import { convertUserParamsToDBUser, upsertUser, upsertUsers } from './twitter'
import {
  and,
  desc,
  eq,
  inArray,
  InferInsertModel,
  InferSelectModel,
  like,
  lt,
  or,
  sql,
} from 'drizzle-orm'
import { zodStringNumber } from '../lib/utils/zod'
import { getTableAliasedColumns } from '../lib/drizzle'
import { groupBy, omit } from 'es-toolkit'

const modlists = new Hono<HonoEnv>().use(auth())

function _upsertUser(
  db: DrizzleD1Database<Record<string, never>> & {
    $client: D1Database
  },
  userParams: z.infer<typeof userSchema>,
) {
  const twitterUser = convertUserParamsToDBUser(userParams)
  return upsertUser(db, twitterUser)
}

export const createSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(300).nullable().optional(),
  avatar: z.string().nullable().optional(),
  twitterUser: userSchema,
  visibility: z.enum(['public', 'protected']).optional(),
})

function datauriToBuffer(datauri: string) {
  const match = datauri.match(/^data:(.+?);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid Data URI format')
  }
  const mimeType = match[1]
  const base64Data = match[2]

  const binaryString = atob(base64Data)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const arrayBuffer = bytes.buffer
  return {
    buffer: arrayBuffer,
    mimeType,
  }
}

export async function uploadAvatar(c: Context, datauri: string) {
  const id = 'modlist-' + ulid() + '.png'
  const { buffer, mimeType } = datauriToBuffer(datauri)
  const avatar = await c.env.MY_BUCKET.put(id, buffer, {
    httpMetadata: {
      contentType: mimeType,
    },
  })
  if (avatar === null) {
    throw new Error('Failed to upload avatar')
  }
  const protocol =
    c.env.APP_ENV === 'development'
      ? 'http://localhost:8787'
      : 'https://mass-block-twitter.rxliuli.com'
  return `${protocol}/api/image/get/${id}`
}
export type ModListCreateRequest = z.infer<typeof createSchema>
export type ModListCreateResponse = InferSelectModel<typeof modList>
modlists.post('/create', zValidator('json', createSchema), async (c) => {
  const validated = c.req.valid('json')
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modListId = ulid()
  if (validated.avatar) {
    validated.avatar = await uploadAvatar(c, validated.avatar)
  }
  const [, [r]] = await db.batch([
    _upsertUser(db, validated.twitterUser),
    db
      .insert(modList)
      .values({
        id: modListId,
        name: validated.name,
        description: validated.description,
        avatar: validated.avatar,
        localUserId: tokenInfo.sub,
        twitterUserId: validated.twitterUser.id,
        visibility: validated.visibility,
        subscriptionCount: 0,
      })
      .returning(),
  ])
  return c.json(r)
})

const updateSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  avatar: z.string().nullable().optional(),
  visibility: z.enum(['public', 'protected']).optional(),
})
export type ModListUpdateRequest = z.infer<typeof updateSchema>
modlists.put('/update/:id', zValidator('json', updateSchema), async (c) => {
  const validated = c.req.valid('json')
  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const _modList = await db
    .select()
    .from(modList)
    .where(and(eq(modList.id, id), eq(modList.localUserId, tokenInfo.sub)))
    .limit(1)
  if (_modList.length === 0) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  if (validated.avatar && validated.avatar.startsWith('data:')) {
    validated.avatar = await uploadAvatar(c, validated.avatar)
  }
  await db
    .update(modList)
    .set(validated)
    .where(and(eq(modList.id, id), eq(modList.localUserId, tokenInfo.sub)))
  return c.json({ code: 'success' })
})

export const removeSchema = z.object({
  id: z.string().describe('modlist id'),
})
export type ModListRemoveRequest = z.infer<typeof removeSchema>
export type ModListRemoveErrorResponse = {
  code: 'modListNotFound' | 'modListHasSubscriptions'
}
modlists.delete('/remove/:id', zValidator('param', removeSchema), async (c) => {
  const validated = c.req.valid('param')
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const [_modList, modListSubscriptions] = await db.batch([
    db
      .select()
      .from(modList)
      .where(
        and(
          eq(modList.id, validated.id),
          eq(modList.localUserId, tokenInfo.sub),
        ),
      )
      .limit(1),
    db
      .select()
      .from(modListSubscription)
      .where(eq(modListSubscription.modListId, validated.id)),
  ])
  if (_modList.length === 0) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  if (modListSubscriptions.length > 0) {
    return c.json({ code: 'modListHasSubscriptions' }, 400)
  }
  await db.batch([
    db.delete(modListUser).where(eq(modListUser.modListId, validated.id)),
    db.delete(modListRule).where(eq(modListRule.modListId, validated.id)),
    db
      .delete(modList)
      .where(
        and(
          eq(modList.id, validated.id),
          eq(modList.localUserId, tokenInfo.sub),
        ),
      ),
  ])
  return c.json({ code: 'success' })
})

export type ModListGetCreatedResponse = InferSelectModel<typeof modList>[]
modlists.get('/created', async (c) => {
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modLists = await db
    .select()
    .from(modList)
    .where(eq(modList.localUserId, tokenInfo.sub))
    .orderBy(desc(modList.updatedAt))
  return c.json<ModListGetCreatedResponse>(modLists)
})

export const subscribeParamSchema = z.object({
  modListId: z.string(),
})
export const subscribeSchema = z.object({
  action: z.enum(['block', 'hide']),
})
export type ModListSubscribeRequest = z.infer<typeof subscribeSchema>
modlists
  .post(
    '/subscribe/:modListId',
    zValidator('param', subscribeParamSchema),
    zValidator('json', subscribeSchema),
    async (c) => {
      const validated = c.req.valid('param')
      const subscribe = c.req.valid('json')
      const db = drizzle(c.env.DB)
      const tokenInfo = c.get('jwtPayload')
      const [_modList, _existingSubscription] = await db.batch([
        db
          .select()
          .from(modList)
          .where(eq(modList.id, validated.modListId))
          .limit(1),
        db
          .select()
          .from(modListSubscription)
          .where(
            and(
              eq(modListSubscription.modListId, validated.modListId),
              eq(modListSubscription.localUserId, tokenInfo.sub),
            ),
          )
          .limit(1),
      ])
      if (_modList.length === 0) {
        return c.json({ code: 'modListNotFound' }, 404)
      }
      if (_existingSubscription.length > 0) {
        await db
          .update(modListSubscription)
          .set({
            action: subscribe.action,
          })
          .where(
            and(
              eq(modListSubscription.modListId, validated.modListId),
              eq(modListSubscription.localUserId, tokenInfo.sub),
            ),
          )
        return c.json({ code: 'success' })
      }
      await db.batch([
        db.insert(modListSubscription).values({
          id: ulid(),
          modListId: validated.modListId,
          localUserId: tokenInfo.sub,
          action: subscribe.action,
        }),
        db
          .update(modList)
          .set({
            subscriptionCount: sql`subscriptionCount + 1`,
            updatedAt: sql`updatedAt`, // don't update updatedAt
          })
          .where(eq(modList.id, validated.modListId)),
      ])
      return c.json({ code: 'success' })
    },
  )
  .delete(
    '/subscribe/:modListId',
    zValidator('param', subscribeParamSchema),
    async (c) => {
      const validated = c.req.valid('param')
      const db = drizzle(c.env.DB)
      const tokenInfo = c.get('jwtPayload')
      const [_modList, _existingSubscription] = await db.batch([
        db.select().from(modList).where(eq(modList.id, validated.modListId)),
        db
          .select()
          .from(modListSubscription)
          .where(
            and(
              eq(modListSubscription.modListId, validated.modListId),
              eq(modListSubscription.localUserId, tokenInfo.sub),
            ),
          ),
      ])
      if (_modList.length === 0) {
        return c.json({ code: 'modListNotFound' }, 404)
      }
      if (_existingSubscription.length === 0) {
        return c.json({ code: 'notSubscribed' }, 400)
      }
      await db.batch([
        db
          .delete(modListSubscription)
          .where(eq(modListSubscription.id, _existingSubscription[0].id)),
        db
          .update(modList)
          .set({
            subscriptionCount: sql`subscriptionCount - 1`,
            updatedAt: sql`updatedAt`, // don't update updatedAt
          })
          .where(eq(modList.id, validated.modListId)),
      ])
      return c.json({ code: 'success' })
    },
  )

export type ModListSubscribeResponse = InferSelectModel<typeof modList>[]
modlists.get('/subscribed/metadata', async (c) => {
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const _modList = await db
    .select()
    .from(modListSubscription)
    .innerJoin(modList, eq(modListSubscription.modListId, modList.id))
    .where(eq(modListSubscription.localUserId, tokenInfo.sub))
  return c.json<ModListSubscribeResponse>(_modList.map((it) => it.ModList))
})
// TODO @deprecated v0.15.1
modlists.get('/subscribed', async (c) => {
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const _modList = await db
    .select()
    .from(modListSubscription)
    .innerJoin(modList, eq(modListSubscription.modListId, modList.id))
    .where(eq(modListSubscription.localUserId, tokenInfo.sub))
  return c.json<ModListSubscribeResponse>(_modList.map((it) => it.ModList))
})

export const addTwitterUserSchema = z.object({
  modListId: z.string(),
  twitterUser: userSchema,
})

export type ModListAddTwitterUserRequest = z.infer<typeof addTwitterUserSchema>
export type ModListAddTwitterUserResponse = InferSelectModel<typeof user>
// @deprecated v0.17.3
modlists.post('/user', zValidator('json', addTwitterUserSchema), async (c) => {
  const validated = c.req.valid('json')
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')

  const [modListExists, userAlreadyInList] = await db.batch([
    db
      .select({
        localUserId: modList.localUserId,
      })
      .from(modList)
      .where(eq(modList.id, validated.modListId)),
    db
      .select()
      .from(modListUser)
      .where(
        and(
          eq(modListUser.modListId, validated.modListId),
          eq(modListUser.twitterUserId, validated.twitterUser.id),
        ),
      ),
  ])
  if (
    modListExists.length === 0 ||
    modListExists[0].localUserId !== tokenInfo.sub
  ) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  if (userAlreadyInList.length > 0) {
    return c.json({ code: 'userAlreadyInModList' }, 400)
  }
  await db.batch([
    _upsertUser(db, validated.twitterUser),
    db.insert(modListUser).values({
      id: ulid(),
      modListId: validated.modListId,
      twitterUserId: validated.twitterUser.id,
    }),
    db
      .update(modList)
      .set({ userCount: sql`userCount + 1` })
      .where(eq(modList.id, validated.modListId)),
  ])
  const result = await db
    .select()
    .from(user)
    .where(eq(user.id, validated.twitterUser.id))
    .get()
  if (!result) {
    return c.json({ code: 'userNotFound' }, 404)
  }
  return c.json<ModListAddTwitterUserResponse>(result)
})
export const addTwitterUsersSchema = z.object({
  modListId: z.string(),
  twitterUsers: z.array(userSchema).min(1).max(99),
})
export type ModListAddTwitterUsersRequest = z.infer<
  typeof addTwitterUsersSchema
>
async function upsertModListUsers(
  db: DrizzleD1Database,
  validated: ModListAddTwitterUsersRequest,
) {
  const existingUsers = await db
    .select()
    .from(modListUser)
    .where(
      and(
        eq(modListUser.modListId, validated.modListId),
        inArray(
          modListUser.twitterUserId,
          validated.twitterUsers.map((it) => it.id),
        ),
      ),
    )
  const existingUsersMap = existingUsers.reduce((acc, it) => {
    acc[it.twitterUserId] = it
    return acc
  }, {} as Record<string, InferSelectModel<typeof modListUser>>)
  const usersToProcess = validated.twitterUsers.filter(
    (it) => !existingUsersMap[it.id],
  )
  return usersToProcess.map((it) =>
    db
      .insert(modListUser)
      .values({
        id: ulid(),
        modListId: validated.modListId,
        twitterUserId: it.id,
      })
      .onConflictDoNothing({
        target: [modListUser.modListId, modListUser.twitterUserId],
      })
      .returning({ inserted: sql`changes()` }),
  )
}
export type ModListAddTwitterUsersResponse = Pick<
  InferSelectModel<typeof user>,
  'id' | 'screenName' | 'name' | 'profileImageUrl' | 'description'
>[]
modlists.post(
  '/users',
  zValidator('json', addTwitterUsersSchema),
  async (c) => {
    const validated = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const _modList = await db
      .select({
        localUserId: modList.localUserId,
      })
      .from(modList)
      .where(eq(modList.id, validated.modListId))
      .get()
    if (!_modList || _modList.localUserId !== tokenInfo.sub) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const usersToProcess = validated.twitterUsers.map((it) =>
      convertUserParamsToDBUser(it),
    )
    const batchItems = (
      await Promise.all([
        upsertUsers(db, usersToProcess),
        upsertModListUsers(db, validated),
      ])
    ).flat()
    if (batchItems.length > 0) {
      const results = (await db.batch(batchItems as any)) as (
        | InferInsertModel<typeof user>[]
        | { inserted: 0 }[]
      )[]
      const inserts = results.flat().filter((it) => 'inserted' in it)
      await db
        .update(modList)
        .set({ userCount: sql`userCount + ${inserts.length}` })
        .where(eq(modList.id, validated.modListId))
    }
    const list = await db
      .select({
        id: user.id,
        screenName: user.screenName,
        name: user.name,
        description: user.description,
        profileImageUrl: user.profileImageUrl,
      })
      .from(user)
      .where(
        inArray(
          user.id,
          validated.twitterUsers.map((it) => it.id),
        ),
      )
    return c.json<ModListAddTwitterUsersResponse>(list)
  },
)

const removeTwitterUserSchema = z.object({
  twitterUserId: z.string(),
  modListId: z.string(),
})
export type ModListRemoveTwitterUserRequest = z.infer<
  typeof removeTwitterUserSchema
>
modlists.delete(
  '/user',
  zValidator('json', removeTwitterUserSchema),
  async (c) => {
    const validated = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const [_modList, _modListUser] = await db.batch([
      db
        .select()
        .from(modList)
        .where(
          and(
            eq(modList.id, validated.modListId),
            eq(modList.localUserId, tokenInfo.sub),
          ),
        ),
      db
        .select()
        .from(modListUser)
        .where(
          and(
            eq(modListUser.modListId, validated.modListId),
            eq(modListUser.twitterUserId, validated.twitterUserId),
          ),
        ),
    ])
    if (_modList.length === 0) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    if (_modListUser.length === 0) {
      return c.json({ code: 'modListUserNotFound' }, 404)
    }
    await db.batch([
      db.delete(modListUser).where(eq(modListUser.id, _modListUser[0].id)),
      db
        .update(modList)
        .set({ userCount: sql`userCount - 1` })
        .where(eq(modList.id, validated.modListId)),
    ])
    return c.json({ code: 'success' })
  },
)

const checkUserSchema = z.object({
  modListId: z.string(),
  users: z.string().transform((str, ctx) => {
    try {
      const json = JSON.parse(str)
      return z.array(userSchema).parse(json)
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON',
      })
      return z.NEVER
    }
  }),
})
export type ModListUserCheckRequest = z.infer<typeof checkUserSchema>
export type ModListUserCheckResponse = Record<string, boolean>
async function checkUsers(c: Context, validated: ModListUserCheckPostRequest) {
  const db = drizzle(c.env.DB)
  if (validated.users.length > 0) {
    // async upsert users, avoid blocking
    db.batch([...validated.users.map((it) => _upsertUser(db, it))] as any)
  }
  const subscriptions = await db
    .select({ twitterUserId: modListUser.twitterUserId })
    .from(modListUser)
    .where(
      and(
        eq(modListUser.modListId, validated.modListId),
        inArray(
          modListUser.twitterUserId,
          validated.users.map((it) => it.id),
        ),
      ),
    )
  const existsIds = new Set(subscriptions.map((it) => it.twitterUserId))
  return c.json(
    validated.users.reduce((acc, it) => {
      acc[it.id] = existsIds.has(it.id)
      return acc
    }, {} as ModListUserCheckResponse),
  )
}
const checkUserPostSchema = z.object({
  modListId: z.string(),
  users: z.array(userSchema),
})
export type ModListUserCheckPostRequest = z.infer<typeof checkUserPostSchema>
modlists.post(
  '/user/check',
  zValidator('json', checkUserPostSchema),
  async (c) => {
    return checkUsers(c, c.req.valid('json'))
  },
)

const ruleSchema = z.object({
  or: z.array(
    z.object({
      and: z.array(
        z.object({
          field: z.string(),
          operator: z.string(),
          value: z.union([z.string(), z.number(), z.boolean()]),
        }),
      ),
    }),
  ),
})
const addRuleSchema = z.object({
  modListId: z.string(),
  name: z.string(),
  rule: ruleSchema,
})
export type ModListAddRuleRequest = z.infer<typeof addRuleSchema>
export type ModListAddRuleResponse = InferSelectModel<typeof modListRule>
modlists.post('/rule', zValidator('json', addRuleSchema), async (c) => {
  const validated = c.req.valid('json')
  const db = drizzle(c.env.DB)
  const [[r]] = await db.batch([
    db
      .insert(modListRule)
      .values({
        id: ulid(),
        name: validated.name,
        modListId: validated.modListId,
        rule: validated.rule,
      })
      .returning(),
    db
      .update(modList)
      .set({
        updatedAt: new Date().toISOString(),
      })
      .where(eq(modList.id, validated.modListId)),
  ])
  return c.json<ModListAddRuleResponse>(r)
})

const updateRuleSchema = z.object({
  name: z.string(),
  rule: ruleSchema,
})
export type ModListUpdateRuleRequest = z.infer<typeof updateRuleSchema>
export type ModListUpdateRuleResponse = InferSelectModel<typeof modListRule>
modlists.put(
  '/rule/:id',
  zValidator('param', z.object({ id: z.string() })),
  zValidator('json', updateRuleSchema),
  async (c) => {
    const validated = c.req.valid('param')
    const validatedJson = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const _modListRule = await db
      .select()
      .from(modListRule)
      .innerJoin(modList, eq(modListRule.modListId, modList.id))
      .where(
        and(
          eq(modListRule.id, validated.id),
          eq(modList.localUserId, tokenInfo.sub),
        ),
      )
      .get()
    if (!_modListRule) {
      return c.json({ code: 'modListRuleNotFound' }, 404)
    }
    const [[r]] = await db.batch([
      db
        .update(modListRule)
        .set({
          name: validatedJson.name,
          rule: validatedJson.rule,
        })
        .where(eq(modListRule.id, validated.id))
        .returning(),
      db
        .update(modList)
        .set({
          updatedAt: new Date().toISOString(),
        })
        .where(eq(modList.id, _modListRule.ModList.id)),
    ])
    return c.json<ModListUpdateRuleResponse>(r)
  },
)

const removeRuleSchema = z.object({
  id: z.string(),
})
export type ModListRemoveRuleRequest = z.infer<typeof removeRuleSchema>
export type ModListRemoveRuleResponse = InferSelectModel<typeof modListRule>
modlists.delete(
  '/rule/:id',
  zValidator('param', removeRuleSchema),
  async (c) => {
    const validated = c.req.valid('param')
    const db = drizzle(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const _modListRule = await db
      .select()
      .from(modListRule)
      .innerJoin(modList, eq(modListRule.modListId, modList.id))
      .where(
        and(
          eq(modListRule.id, validated.id),
          eq(modList.localUserId, tokenInfo.sub),
        ),
      )
      .get()
    if (!_modListRule) {
      return c.json({ code: 'modListRuleNotFound' }, 404)
    }
    await db.batch([
      db.delete(modListRule).where(eq(modListRule.id, validated.id)),
      db
        .update(modList)
        .set({
          updatedAt: new Date().toISOString(),
        })
        .where(eq(modList.id, _modListRule.ModList.id)),
    ])
    return c.json({ code: 'success' })
  },
)

interface CacheItem {
  updatedAt: string
  data: Omit<ModListSubscribedUserAndRulesResponse[number], 'action'>
}

async function queryModListSubscribedUserAndRulesByCache(
  c: Context,
  _modListIds: {
    modListId: string
    updatedAt: string
    action: InferSelectModel<typeof modListSubscription>['action']
  }[],
): Promise<ModListSubscribedUserAndRulesResponse> {
  const modListGrouped = groupBy(_modListIds, (it) => it.modListId)

  const db = drizzle(c.env.DB)
  let cacheIds: string[] = []

  const cached = (
    await Promise.all(
      _modListIds.map(async (it) => {
        const cachedStr = await c.env.MY_KV.get('modlist:' + it.modListId)
        if (!cachedStr) {
          return
        }
        try {
          const cached = JSON.parse(cachedStr) as CacheItem
          if (cached && cached.updatedAt === it.updatedAt) {
            cacheIds.push(it.modListId)
            return {
              ...cached.data,
              action: it.action,
            }
          }
        } catch {}
      }),
    )
  ).filter(Boolean) as ModListSubscribedUserAndRulesResponse
  const queryIds = _modListIds
    .filter((it) => !cacheIds.includes(it.modListId))
    .map((it) => it.modListId)
  const [modListUsers, modListRules] = await Promise.all([
    db
      .select({
        twitterUserId: modListUser.twitterUserId,
        modListId: modListUser.modListId,
      })
      .from(modListUser)
      .where(inArray(modListUser.modListId, queryIds)),
    db
      .select({
        rule: modListRule.rule,
        modListId: modListRule.modListId,
      })
      .from(modListRule)
      .where(inArray(modListRule.modListId, queryIds)),
  ])
  const modListUsersGrouped = groupBy(modListUsers, (it) => it.modListId)
  const modListRulesGrouped = groupBy(modListRules, (it) => it.modListId)
  const grouped = queryIds
    .map((it) => {
      const modListUsers = modListUsersGrouped[it] ?? []
      const modListRules = modListRulesGrouped[it] ?? []
      const modList = modListGrouped[it][0]
      if (!modList) {
        throw new Error('modList is required ' + it)
      }
      if (!modList.action) {
        throw new Error('action is required ' + it)
      }
      return {
        updatedAt: modList.updatedAt,
        data: {
          modListId: it,
          action: modList.action,
          twitterUserIds: modListUsers.map((it) => it.twitterUserId),
          rules: modListRules.map((it) => it.rule),
        } satisfies ModListSubscribedUserAndRulesResponse[number],
      }
    })
    .filter(
      (it) => it.data.rules.length > 0 || it.data.twitterUserIds.length > 0,
    )
  await Promise.all(
    grouped.map(async (it) => {
      await c.env.MY_KV.put(
        'modlist:' + it.data.modListId,
        JSON.stringify({
          updatedAt: it.updatedAt,
          data: omit(it.data, ['action']),
        }),
        {
          // cache 7 days
          expirationTtl: 60 * 60 * 24 * 7,
        },
      )
    }),
  )
  return [...cached, ...grouped.map((it) => it.data)]
}

export type ModListSubscribedUserAndRulesResponse = {
  modListId: string
  action: 'block' | 'hide'
  twitterUserIds: string[]
  rules: InferSelectModel<typeof modListRule>['rule'][]
}[]
modlists.get('/subscribed/users', async (c) => {
  const tokenInfo = c.get('jwtPayload')
  const db = drizzle(c.env.DB)
  const _modListIds = await db
    .select({
      modListId: modListSubscription.modListId,
      action: modListSubscription.action,
      updatedAt: modList.updatedAt,
    })
    .from(modListSubscription)
    .innerJoin(modList, eq(modListSubscription.modListId, modList.id))
    .where(eq(modListSubscription.localUserId, tokenInfo.sub))
  const resp = await queryModListSubscribedUserAndRulesByCache(c, _modListIds)
  return c.json<ModListSubscribedUserAndRulesResponse>(resp, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  })
})

const searchSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  keyword: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  sortBy: z.enum(['updatedAt', 'userCount', 'subscriptionCount']).optional(),
  filterBy: z.enum(['all', 'subscription']).optional(),
})

export type ModListSearchResponse = InferSelectModel<typeof modList>[]

const search = new Hono<HonoEnv>()

search.get('/search', zValidator('query', searchSchema), async (c) => {
  // const _validated = c.req.valid('query')
  const db = drizzle(c.env.DB)
  const modLists = await db
    .select()
    .from(modList)
    .where(eq(modList.visibility, 'public'))
    .orderBy(desc(modList.updatedAt))
  return c.json<ModListSearchResponse>(modLists)
})

export type ModListGetResponse = InferSelectModel<typeof modList> & {
  subscribed: boolean
  owner: boolean
  twitterUser: InferSelectModel<typeof user>
  action: 'block' | 'hide'
  ruleCount: number
}
export type ModListGetErrorResponse = {
  code: 'modListNotFound'
}
search
  // get modlist metadata by id
  .get('/get/:id', async (c) => {
    const id = c.req.param('id')
    const db = drizzle(c.env.DB)
    const tokenInfo = await getTokenInfo(c)
    const [_modList, ruleCount, _subscribed] = await db.batch([
      db
        .select({
          modList: getTableAliasedColumns(modList),
          user: getTableAliasedColumns(user),
        })
        .from(modList)
        .innerJoin(user, eq(modList.twitterUserId, user.id))
        .where(eq(modList.id, id))
        .limit(1),
      db
        .select({
          ruleCount: sql<number>`count(${modListRule.id})`,
        })
        .from(modListRule)
        .where(eq(modListRule.modListId, id)),
      ...(tokenInfo
        ? [
            db
              .select()
              .from(modListSubscription)
              .where(
                and(
                  eq(modListSubscription.modListId, id),
                  eq(modListSubscription.localUserId, tokenInfo.sub),
                ),
              )
              .limit(1),
          ]
        : []),
    ])
    if (_modList.length === 0) {
      return c.json<ModListGetErrorResponse>({ code: 'modListNotFound' }, 404)
    }
    const subscribed = _subscribed?.length > 0
    const owner = _modList[0].modList.localUserId === tokenInfo?.sub
    return c.json<ModListGetResponse>({
      ..._modList[0].modList,
      subscribed,
      owner,
      twitterUser: _modList[0].user,
      action: subscribed ? 'block' : 'hide',
      ruleCount: ruleCount[0].ruleCount,
    })
  })

const usersSchema = z.object({
  modListId: z.string(),
  cursor: z.string().optional(),
  query: z.string().optional(),
  limit: zodStringNumber().optional(),
})
export type ModListUsersRequest = z.infer<typeof usersSchema>
export type ModListUsersResponse = (Pick<
  InferSelectModel<typeof user>,
  'id' | 'screenName' | 'name' | 'profileImageUrl' | 'description'
> & {
  modListUserId: string
})[]
export type ModListUsersPageResponse = {
  data: ModListUsersResponse
  cursor: string
}
search
  // get modlist users by modlist id
  .get('/users', zValidator('query', usersSchema), async (c) => {
    const validated = c.req.valid('query')
    const db = drizzle(c.env.DB)
    const conditions = [eq(modListUser.modListId, validated.modListId)]
    if (validated.cursor) {
      conditions.push(lt(modListUser.id, validated.cursor))
    }
    if (validated.query) {
      conditions.push(
        or(
          like(user.screenName, `%${validated.query}%`),
          like(user.name, `%${validated.query}%`),
          like(user.description, `%${validated.query}%`),
        )!,
      )
    }
    const modListUsers = await db
      .select()
      .from(modListUser)
      .innerJoin(user, eq(modListUser.twitterUserId, user.id))
      .where(and(...conditions))
      .orderBy(desc(modListUser.id))
      .limit(validated.limit ?? 20)
    return c.json({
      data: modListUsers.map((it) => ({
        id: it.ModListUser.twitterUserId,
        screenName: it.User.screenName,
        name: it.User.name,
        description: it.User.description,
        profileImageUrl: it.User.profileImageUrl,
        modListUserId: it.ModListUser.id,
      })),
      cursor: modListUsers[modListUsers.length - 1]?.ModListUser.id,
    } satisfies ModListUsersPageResponse)
  })

const rulesSchema = z.object({
  modListId: z.string(),
  cursor: z.string().optional(),
  limit: zodStringNumber().optional(),
})
export type ModListRulesRequest = z.infer<typeof rulesSchema>
export type ModListRule = InferSelectModel<typeof modListRule>
export type ModListRulesPageResponse = {
  data: ModListRule[]
  cursor?: string
}
search.get('/rules', zValidator('query', rulesSchema), async (c) => {
  const validated = c.req.valid('query')
  const db = drizzle(c.env.DB)
  const conditions = [eq(modListRule.modListId, validated.modListId)]
  if (validated.cursor) {
    conditions.push(lt(modListRule.id, validated.cursor))
  }
  const limit = validated.limit ?? 20
  const rules = await db
    .select()
    .from(modListRule)
    .where(and(...conditions))
    .orderBy(desc(modListRule.id))
    .limit(limit)
  return c.json<ModListRulesPageResponse>({
    data: rules,
    cursor: rules.length === limit ? rules[rules.length - 1]?.id : undefined,
  })
})

export interface ModListIdsResponse {
  twitterUserIds: string[]
}
search.get(
  '/ids/:id',
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const id = c.req.param('id')
    const db = drizzle(c.env.DB)

    const _modList = await db
      .select({
        modListId: modList.id,
        updatedAt: modList.updatedAt,
        action: sql<
          InferSelectModel<typeof modListSubscription>['action']
        >`"hide"`,
      })
      .from(modList)
      .where(eq(modList.id, id))
      .limit(1)
    if (_modList.length === 0) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const resp = await queryModListSubscribedUserAndRulesByCache(c, _modList)
    return c.json<ModListIdsResponse>(
      { twitterUserIds: resp[0].twitterUserIds },
      { headers: { 'Cache-Control': 'public, max-age=86400' } },
    )
  },
)

export { modlists, search as modlistSearch }
export type { ModListConditionItem } from '../db/schema'
