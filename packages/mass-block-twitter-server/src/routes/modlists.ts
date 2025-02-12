import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { ulid } from '../lib/ulid'
import { userSchema } from '../lib/request'
import { PrismaClient } from '@prisma/client'

const modlists = new Hono<HonoEnv>()

const subscribeSchema = z.object({
  modListId: z.string(),
})

const createSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(300).optional(),
  iconUrl: z.string().optional(),
  twitterUser: userSchema,
})

const removeSchema = z.object({
  id: z.string(),
})

const addTwitterUserSchema = z.object({
  modListId: z.string(),
  twitterUser: userSchema,
})

const removeTwitterUserSchema = z.object({
  id: z.string(),
})

async function upsertUser(prisma: PrismaClient, user: typeof userSchema._type) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      screenName: user.screen_name,
      name: user.name,
      description: user.description,
      profileImageUrl: user.profile_image_url,
      accountCreatedAt: user.created_at,
    },
    create: {
      id: user.id,
      screenName: user.screen_name,
      name: user.name,
      description: user.description,
      profileImageUrl: user.profile_image_url,
      accountCreatedAt: user.created_at,
    },
  })
}

modlists
  .post('/create', zValidator('json', createSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    await upsertUser(prisma, validated.twitterUser)
    await prisma.modList.create({
      data: {
        id: ulid(),
        name: validated.name,
        description: validated.description,
        iconUrl: validated.iconUrl,
        localUserId: tokenInfo.id,
        twitterUserId: validated.twitterUser.id,
      },
    })
    return c.json({ code: 'success' })
  })
  .delete('/create', zValidator('json', removeSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modList.findUnique({
      where: { id: validated.id, localUserId: tokenInfo.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    if (modList.subscriptionCount > 0) {
      return c.json({ code: 'modListHasSubscriptions' }, 400)
    }
    await prisma.$transaction([
      prisma.modListUser.deleteMany({
        where: { modListId: validated.id },
      }),
      prisma.modListSubscription.deleteMany({
        where: { modListId: validated.id },
      }),
      prisma.modList.delete({
        where: { id: validated.id, localUserId: tokenInfo.id },
      }),
    ])
    return c.json({ code: 'success' })
  })
  .post('/subscribe', zValidator('json', subscribeSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modList.findUnique({
      where: { id: validated.modListId },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    await prisma.$transaction([
      prisma.modListSubscription.create({
        data: {
          id: ulid(),
          modListId: validated.modListId,
          localUserId: tokenInfo.id,
        },
      }),
      prisma.modList.update({
        where: { id: validated.modListId },
        data: { subscriptionCount: { increment: 1 } },
      }),
    ])
    return c.json({ code: 'success' })
  })
  .delete('/subscribe', zValidator('json', subscribeSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modList.findUnique({
      where: { id: validated.modListId },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    await prisma.$transaction([
      prisma.modListSubscription.delete({
        where: { id: validated.modListId, localUserId: tokenInfo.id },
      }),
      prisma.modList.update({
        where: { id: validated.modListId },
        data: { subscriptionCount: { decrement: 1 } },
      }),
    ])
    return c.json({ code: 'success' })
  })
  .post('/user', zValidator('json', addTwitterUserSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modList.findUnique({
      where: { id: validated.modListId, localUserId: tokenInfo.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    await upsertUser(prisma, validated.twitterUser)
    await prisma.$transaction([
      prisma.modListUser.create({
        data: {
          id: ulid(),
          modListId: validated.modListId,
          userId: tokenInfo.id,
        },
      }),
      prisma.modList.update({
        where: { id: validated.modListId },
        data: { userCount: { increment: 1 } },
      }),
    ])
    return c.json({ code: 'success' })
  })
  .delete('/user', zValidator('json', removeTwitterUserSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modListUser = await prisma.modListUser.findUnique({
      where: { id: validated.id, userId: tokenInfo.id },
    })
    if (!modListUser) {
      return c.json({ code: 'modListUserNotFound' }, 404)
    }
    await prisma.$transaction([
      prisma.modListUser.delete({
        where: { id: validated.id, userId: tokenInfo.id },
      }),
      prisma.modList.update({
        where: { id: modListUser.modListId },
        data: { userCount: { decrement: 1 } },
      }),
    ])
    return c.json({ code: 'success' })
  })

const searchSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  keyword: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  sortBy: z.enum(['updatedAt', 'userCount', 'subscriptionCount']).optional(),
  filterBy: z.enum(['all', 'subscription']).optional(),
})

const modlistSearch = new Hono<HonoEnv>().get(
  '/',
  zValidator('query', searchSchema),
  async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const modLists = await prisma.modList.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return c.json({ code: 'success', data: modLists })
  },
)

export { modlists, modlistSearch }
