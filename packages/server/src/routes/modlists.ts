import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ulid } from 'ulidx'
import { userSchema } from '../lib/request'
import { getTokenInfo } from '../middlewares/auth'
import { drizzle } from 'drizzle-orm/d1'
import {
  localUser,
  modList,
  modListSubscription,
  modListUser,
  user,
} from '../db/schema'
import { convertUserParamsToDBUser } from './twitter'
import { and, desc, eq, inArray, InferSelectModel, lt, sql } from 'drizzle-orm'
import { zodStringNumber } from '../lib/utils/zod'
import { getTableAliasedColumns } from '../lib/drizzle'

const modlists = new Hono<HonoEnv>()

function upsertUser(
  db: ReturnType<typeof drizzle>,
  userParams: typeof userSchema._type,
) {
  const twitterUser = convertUserParamsToDBUser(userParams)
  return db
    .insert(user)
    .values(twitterUser)
    .onConflictDoUpdate({
      target: user.id,
      set: twitterUser,
    })
    .returning()
}

export const createSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(300).optional(),
  avatar: z.string().optional(),
  twitterUser: userSchema,
  visibility: z.enum(['public', 'protected']).optional(),
})
export type ModListCreateRequest = z.infer<typeof createSchema>
export type ModListCreateResponse = InferSelectModel<typeof modList>
modlists.post('/create', zValidator('json', createSchema), async (c) => {
  const validated = c.req.valid('json')
  const db = drizzle(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modListId = ulid()
  const [, [r]] = await db.batch([
    upsertUser(db, validated.twitterUser),
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
    db.insert(modListSubscription).values({
      id: ulid(),
      localUserId: tokenInfo.sub,
      modListId: modListId,
    }),
  ])
  return c.json(r)
})

const updateSchema = z.object({
  name: z.string().max(100),
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

export const subscribeSchema = z.object({
  modListId: z.string().describe('modlist id'),
})

export type ModListSubscribeRequest = z.infer<typeof subscribeSchema>

export type ModListSubscribeResponse = InferSelectModel<typeof modList>[]

modlists
  .post(
    '/subscribe/:modListId',
    zValidator('param', subscribeSchema),
    async (c) => {
      const validated = c.req.valid('param')
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
        return c.json({ code: 'success' })
      }
      await db.batch([
        db.insert(modListSubscription).values({
          id: ulid(),
          modListId: validated.modListId,
          localUserId: tokenInfo.sub,
        }),
        db
          .update(modList)
          .set({
            subscriptionCount: sql`subscriptionCount + 1`,
          })
          .where(eq(modList.id, validated.modListId)),
      ])
      return c.json({ code: 'success' })
    },
  )
  .delete(
    '/subscribe/:modListId',
    zValidator('param', subscribeSchema),
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
          })
          .where(eq(modList.id, validated.modListId)),
      ])
      return c.json({ code: 'success' })
    },
  )
  .get('/subscribed', async (c) => {
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
  const [[user]] = await db.batch([
    upsertUser(db, validated.twitterUser),
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
  return c.json(user)
})

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
  // TODO need to upsert users for cloudflare queue async
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
  users: z.array(z.object({ id: z.string() })),
})
export type ModListUserCheckPostRequest = z.infer<typeof checkUserPostSchema>
modlists.post(
  '/user/check',
  zValidator('json', checkUserPostSchema),
  async (c) => {
    return checkUsers(c, c.req.valid('json'))
  },
)

export type ModListSubscribedUserResponse = {
  modListId: string
  twitterUserIds: string[]
}[]
modlists.get('/subscribed/users', async (c) => {
  const tokenInfo = c.get('jwtPayload')
  const db = drizzle(c.env.DB)
  const _modLists = await db
    .select({
      modListId: modListSubscription.modListId,
      twitterUserId: modListUser.twitterUserId,
    })
    .from(modListSubscription)
    .leftJoin(
      modListUser,
      eq(modListSubscription.modListId, modListUser.modListId),
    )
    .where(eq(modListSubscription.localUserId, tokenInfo.sub))
  const modListMap = _modLists.reduce((acc, it) => {
    if (!acc[it.modListId]) {
      acc[it.modListId] = []
    }
    if (it.twitterUserId) {
      acc[it.modListId].push(it.twitterUserId)
    }
    return acc
  }, {} as Record<string, string[]>)
  return c.json<ModListSubscribedUserResponse>(
    Object.entries(modListMap)
      .filter(([_, twitterUserIds]) => twitterUserIds.length > 0)
      .map(([modListId, twitterUserIds]) => ({
        modListId,
        twitterUserIds,
      })),
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
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

const search = new Hono<HonoEnv>().get(
  '/search',
  zValidator('query', searchSchema),
  async (c) => {
    // const _validated = c.req.valid('query')
    const db = drizzle(c.env.DB)
    const modLists = await db
      .select()
      .from(modList)
      .where(eq(modList.visibility, 'public'))
      .orderBy(desc(modList.updatedAt))
    return c.json<ModListSearchResponse>(modLists)
  },
)

export type ModListGetResponse = InferSelectModel<typeof modList> & {
  subscribed: boolean
  owner: boolean
  twitterUser: InferSelectModel<typeof user>
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
    const [_modList, _subscribed] = await db.batch([
      db
        .select({
          modList: getTableAliasedColumns(modList),
          user: getTableAliasedColumns(user),
        })
        .from(modList)
        .innerJoin(user, eq(modList.twitterUserId, user.id))
        .where(eq(modList.id, id))
        .limit(1),
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
    })
  })

const usersSchema = z.object({
  modListId: z.string(),
  cursor: z.string().optional(),
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

export { modlists, search as modlistSearch }
