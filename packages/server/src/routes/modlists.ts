import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { ulid } from 'ulidx'
import { userSchema } from '../lib/request'
import { ModList, PrismaClient, User } from '@prisma/client'
import { getTokenInfo } from '../middlewares/auth'
import { decode } from 'hono/jwt'

const modlists = new Hono<HonoEnv>()

function upsertUser(prisma: PrismaClient, user: typeof userSchema._type) {
  const twitterUser = {
    id: user.id,
    screenName: user.screen_name,
    name: user.name,
    description: user.description,
    profileImageUrl: user.profile_image_url,
    accountCreatedAt: user.created_at,
    blueVerified: user.is_blue_verified,
    followersCount: user.followers_count,
    followingCount: user.friends_count,
    defaultProfile: user.default_profile,
    defaultProfileImage: user.default_profile_image,
  } as Parameters<typeof prisma.user.create>[0]['data']
  return prisma.user.upsert({
    where: { id: user.id },
    update: twitterUser,
    create: twitterUser,
  })
}

export const createSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(300).optional(),
  avatar: z.string().optional(),
  twitterUser: userSchema,
  visibility: z.enum(['public', 'protected']).optional(),
})
export type ModListCreateRequest = z.infer<typeof createSchema>
export type ModListCreateResponse = ModList
modlists.post('/create', zValidator('json', createSchema), async (c) => {
  const validated = c.req.valid('json')
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  await upsertUser(prisma, validated.twitterUser)
  const r = await prisma.modList.create({
    data: {
      id: ulid(),
      name: validated.name,
      description: validated.description,
      avatar: validated.avatar,
      localUserId: tokenInfo.sub,
      twitterUserId: validated.twitterUser.id,
      visibility: validated.visibility,
      subscriptionCount: 0,
    },
  })
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
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modList = await prisma.modList.findUnique({
    where: { id, localUserId: tokenInfo.sub },
  })
  if (!modList) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  await prisma.modList.update({
    where: { id },
    data: {
      name: validated.name,
      description: validated.description,
      avatar: validated.avatar,
      visibility: validated.visibility,
    },
  })
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
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modList = await prisma.modList.findUnique({
    where: { id: validated.id, localUserId: tokenInfo.sub },
  })
  if (!modList) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  if (modList.subscriptionCount > 0) {
    return c.json({ code: 'modListHasSubscriptions' }, 400)
  }
  // await prisma.$transaction([
  //   prisma.modListUser.deleteMany({
  //     where: { modListId: validated.id },
  //   }),
  //   prisma.modList.delete({
  //     where: { id: validated.id, localUserId: tokenInfo.id },
  //   }),
  // ])
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM modListUser WHERE modListId = ?').bind(
      validated.id,
    ),
    c.env.DB.prepare('DELETE FROM modList WHERE id = ?').bind(validated.id),
  ])
  return c.json({ code: 'success' })
})

export type ModListGetCreatedResponse = ModList[]
modlists.get('/created', async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modLists = await prisma.modList.findMany({
    where: { localUserId: tokenInfo.sub },
    orderBy: { updatedAt: 'desc' },
  })
  return c.json<ModListGetCreatedResponse>(modLists)
})

export const subscribeSchema = z.object({
  modListId: z.string().describe('modlist id'),
})

export type ModListSubscribeRequest = z.infer<typeof subscribeSchema>

export type ModListSubscribeResponse = ModList[]

modlists
  .post(
    '/subscribe/:modListId',
    zValidator('param', subscribeSchema),
    async (c) => {
      const validated = c.req.valid('param')
      const prisma = await prismaClients.fetch(c.env.DB)
      const tokenInfo = c.get('jwtPayload')
      const modList = await prisma.modList.findUnique({
        where: { id: validated.modListId },
      })
      if (!modList) {
        return c.json({ code: 'modListNotFound' }, 404)
      }
      const existingSubscription = await prisma.modListSubscription.findUnique({
        where: {
          modListId_localUserId: {
            modListId: validated.modListId,
            localUserId: tokenInfo.sub,
          },
        },
      })
      if (existingSubscription) {
        return c.json({ code: 'alreadySubscribed' }, 400)
      }
      // await prisma.$transaction([
      //   prisma.modListSubscription.create({
      //     data: {
      //       id: ulid(),
      //       modListId: validated.modListId,
      //       localUserId: tokenInfo.id,
      //     },
      //   }),
      //   prisma.modList.update({
      //     where: { id: validated.modListId },
      //     data: { subscriptionCount: { increment: 1 } },
      //   }),
      // ])
      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT INTO modListSubscription (id, modListId, localUserId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ).bind(
          ulid(),
          validated.modListId,
          tokenInfo.sub,
          new Date().toISOString(),
          new Date().toISOString(),
        ),
        c.env.DB.prepare(
          'UPDATE modList SET subscriptionCount = subscriptionCount + 1 WHERE id = ?',
        ).bind(validated.modListId),
      ])
      return c.json({ code: 'success' })
    },
  )
  .delete(
    '/subscribe/:modListId',
    zValidator('param', subscribeSchema),
    async (c) => {
      const validated = c.req.valid('param')
      const prisma = await prismaClients.fetch(c.env.DB)
      const tokenInfo = c.get('jwtPayload')
      const modList = await prisma.modList.findUnique({
        where: { id: validated.modListId },
      })
      if (!modList) {
        return c.json({ code: 'modListNotFound' }, 404)
      }
      const existingSubscription = await prisma.modListSubscription.findUnique({
        where: {
          modListId_localUserId: {
            modListId: validated.modListId,
            localUserId: tokenInfo.sub,
          },
        },
      })
      if (!existingSubscription) {
        return c.json({ code: 'notSubscribed' }, 400)
      }
      // await prisma.$transaction([
      //   prisma.modListSubscription.delete({
      //     where: { id: existingSubscription.id },
      //   }),
      //   prisma.modList.update({
      //     where: { id: validated.modListId },
      //     data: { subscriptionCount: { decrement: 1 } },
      //   }),
      // ])
      await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM modListSubscription WHERE id = ?').bind(
          existingSubscription.id,
        ),
        c.env.DB.prepare(
          'UPDATE modList SET subscriptionCount = subscriptionCount - 1 WHERE id = ?',
        ).bind(validated.modListId),
      ])
      return c.json({ code: 'success' })
    },
  )
  .get('/subscribed', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const modList = await prisma.modListSubscription.findMany({
      select: {
        modList: true,
      },
      where: { localUserId: tokenInfo.sub },
    })
    return c.json<ModListSubscribeResponse>(modList.map((it) => it.modList))
  })

export const addTwitterUserSchema = z.object({
  modListId: z.string(),
  twitterUser: userSchema,
})

export type ModListAddTwitterUserRequest = z.infer<typeof addTwitterUserSchema>
export type ModListAddTwitterUserResponse = User
modlists.post('/user', zValidator('json', addTwitterUserSchema), async (c) => {
  const validated = c.req.valid('json')
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const result = await prisma.modList.findUnique({
    where: {
      id: validated.modListId,
      localUserId: tokenInfo.sub,
    },
    include: {
      ModListUser: {
        where: {
          twitterUserId: validated.twitterUser.id,
        },
        take: 1,
      },
    },
  })
  if (!result) {
    return c.json({ code: 'modListNotFound' }, 404)
  }
  if (result.ModListUser.length > 0) {
    return c.json({ code: 'userAlreadyInModList' }, 400)
  }
  await upsertUser(prisma, validated.twitterUser)
  // await prisma.$transaction([
  //   prisma.modListUser.create({
  //     data: {
  //       id: ulid(),
  //       modListId: validated.modListId,
  //       twitterUserId: validated.twitterUser.id,
  //     },
  //   }),
  //   prisma.modList.update({
  //     where: { id: validated.modListId },
  //     data: { userCount: { increment: 1 } },
  //   }),
  // ])
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO modListUser (id, modListId, twitterUserId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      ulid(),
      validated.modListId,
      validated.twitterUser.id,
      new Date().toISOString(),
      new Date().toISOString(),
    ),
    c.env.DB.prepare(
      'UPDATE modList SET userCount = userCount + 1 WHERE id = ?',
    ).bind(validated.modListId),
  ])
  const user = await prisma.user.findUnique({
    where: { id: validated.twitterUser.id },
  })
  if (!user) {
    return c.json({ code: 'userNotFound' }, 404)
  }
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
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('jwtPayload')
    const modList = await prisma.modList.findUnique({
      where: {
        id: validated.modListId,
        localUserId: tokenInfo.sub,
      },
      include: {
        ModListUser: {
          where: {
            twitterUserId: validated.twitterUserId,
          },
          take: 1,
        },
      },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    if (modList.ModListUser.length === 0) {
      return c.json({ code: 'modListUserNotFound' }, 404)
    }
    // await prisma.$transaction([
    //   prisma.modListUser.delete({
    //     where: { id: modList.ModListUser[0].id },
    //   }),
    //   prisma.modList.update({
    //     where: { id: validated.modListId },
    //     data: { userCount: { decrement: 1 } },
    //   }),
    // ])
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM modListUser WHERE id = ?').bind(
        modList.ModListUser[0].id,
      ),
      c.env.DB.prepare(
        'UPDATE modList SET userCount = userCount - 1 WHERE id = ?',
      ).bind(validated.modListId),
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
  const prisma = await prismaClients.fetch(c.env.DB)
  // TODO need to upsert users for cloudflare queue async
  // await prisma.$transaction(validated.users.map((it) => upsertUser(prisma, it)))
  const subscriptions = await prisma.modListUser.findMany({
    select: { twitterUserId: true },
    where: {
      modListId: validated.modListId,
      twitterUserId: {
        in: validated.users.map((it) => it.id),
      },
    },
  })
  const existsIds = new Set(subscriptions.map((it) => it.twitterUserId))
  return c.json(
    validated.users.reduce((acc, it) => {
      acc[it.id] = existsIds.has(it.id)
      return acc
    }, {} as ModListUserCheckResponse),
  )
}
// TODO deprecated
modlists.get('/user/check', zValidator('query', checkUserSchema), async (c) => {
  return checkUsers(c, c.req.valid('query'))
})
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
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('jwtPayload')
  const modLists = await prisma.modListSubscription.findMany({
    where: { localUserId: tokenInfo.sub, modList: { userCount: { gt: 0 } } },
    include: {
      modList: {
        include: {
          ModListUser: {
            select: { twitterUserId: true },
          },
        },
      },
    },
  })
  const resp = c.json<ModListSubscribedUserResponse>(
    modLists.map((it) => ({
      modListId: it.modList.id,
      twitterUserIds: it.modList.ModListUser.map((it) => it.twitterUserId),
    })),
  )
  return c.json<ModListSubscribedUserResponse>(
    modLists.map((it) => ({
      modListId: it.modList.id,
      twitterUserIds: it.modList.ModListUser.map((it) => it.twitterUserId),
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

export type ModListSearchResponse = ModList[]

const search = new Hono<HonoEnv>().get(
  '/search',
  zValidator('query', searchSchema),
  async (c) => {
    const _validated = c.req.valid('query')
    const prisma = await prismaClients.fetch(c.env.DB)
    const modLists = await prisma.modList.findMany({
      orderBy: { updatedAt: 'desc' },
      where: {
        visibility: 'public',
      },
    })
    return c.json<ModListSearchResponse>(modLists)
  },
)

export type ModListGetResponse = ModList & {
  subscribed: boolean
  owner: boolean
  twitterUser: User
}
export type ModListGetErrorResponse = {
  code: 'modListNotFound'
}
search
  // get modlist metadata by id
  .get('/get/:id', async (c) => {
    const id = c.req.param('id')
    const prisma = await prismaClients.fetch(c.env.DB)
    const modList = await prisma.modList.findUnique({
      where: { id },
      include: {
        twitterUser: true,
      },
    })
    if (!modList) {
      return c.json<ModListGetErrorResponse>({ code: 'modListNotFound' }, 404)
    }
    const tokenInfo = await getTokenInfo(c)
    const subscribed = tokenInfo
      ? (await prisma.modListSubscription.count({
          where: { modListId: id, localUserId: tokenInfo.sub },
        })) > 0
      : false
    const owner = modList.localUserId === tokenInfo?.sub
    return c.json<ModListGetResponse>({
      ...modList,
      subscribed,
      owner,
    })
  })

const usersSchema = z.object({
  modListId: z.string(),
  cursor: z.string().optional(),
  limit: z.coerce.number().optional().catch(20),
})
export type ModListUsersRequest = z.infer<typeof usersSchema>
export type ModListUsersResponse = Pick<
  User,
  'id' | 'screenName' | 'name' | 'profileImageUrl' | 'description'
>[]
export type ModListUsersPageResponse = {
  data: ModListUsersResponse
  cursor: string
}
search
  // get modlist users by modlist id
  .get('/users', zValidator('query', usersSchema), async (c) => {
    const validated = c.req.valid('query')
    const prisma = await prismaClients.fetch(c.env.DB)
    const modList = await prisma.modList.findUnique({
      where: { id: validated.modListId },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const modListUsers = await prisma.modListUser.findMany({
      select: {
        id: true,
        twitterUser: {
          select: {
            id: true,
            screenName: true,
            name: true,
            profileImageUrl: true,
            description: true,
          },
        },
      },
      where: { modListId: validated.modListId },
      orderBy: {
        createdAt: 'desc',
      },
      take: validated.limit ?? 20,
      cursor: validated.cursor ? { id: validated.cursor } : undefined,
      skip: validated.cursor ? 1 : 0,
    })
    return c.json({
      data: modListUsers.map((it) => it.twitterUser),
      cursor: modListUsers[modListUsers.length - 1]?.id,
    } satisfies ModListUsersPageResponse)
  })

export { modlists, search as modlistSearch }
