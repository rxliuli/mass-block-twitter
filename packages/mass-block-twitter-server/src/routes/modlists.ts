import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { ulid } from '../lib/ulid'
import { userSchema } from '../lib/request'
import { PrismaClient } from '@prisma/client'
import { getTokenInfo } from '../middlewares/auth'

const modlists = new Hono<HonoEnv>()

export const subscribeSchema = z.object({
  id: z.string().describe('modlist id'),
})

export const createSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(300).optional(),
  avatar: z.string().optional(),
  twitterUser: userSchema,
})

export const removeSchema = z.object({
  id: z.string().describe('modlist id'),
})

export const addTwitterUserSchema = z.object({
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
    const r = await prisma.modList.create({
      data: {
        id: ulid(),
        name: validated.name,
        description: validated.description,
        avatar: validated.avatar,
        localUserId: tokenInfo.id,
        twitterUserId: validated.twitterUser.id,
      },
    })
    return c.json({ code: 'success', data: r })
  })
  .delete('/remove', zValidator('json', removeSchema), async (c) => {
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
    // TODO https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
    // await c.env.DB.batch([
    //   c.env.DB.prepare('DELETE FROM modListUser WHERE modListId = ?').bind(
    //     validated.id,
    //   ),
    //   c.env.DB.prepare(
    //     'DELETE FROM modListSubscription WHERE modListId = ?',
    //   ).bind(validated.id),
    //   c.env.DB.prepare('DELETE FROM modList WHERE id = ?').bind(validated.id),
    // ])
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
  .get('/created', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modLists = await prisma.modList.findMany({
      where: { localUserId: tokenInfo.id },
    })
    return c.json({ code: 'success', data: modLists })
  })
  .post('/subscribe', zValidator('json', subscribeSchema), async (c) => {
    const validated = c.req.valid('json')
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modList.findUnique({
      where: { id: validated.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const existingSubscription = await prisma.modListSubscription.count({
      where: { modListId: validated.id, localUserId: tokenInfo.id },
    })
    if (existingSubscription > 0) {
      return c.json({ code: 'alreadySubscribed' }, 400)
    }
    await prisma.$transaction([
      prisma.modListSubscription.create({
        data: {
          id: ulid(),
          modListId: validated.id,
          localUserId: tokenInfo.id,
        },
      }),
      prisma.modList.update({
        where: { id: validated.id },
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
      where: { id: validated.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    await prisma.$transaction([
      prisma.modListSubscription.delete({
        where: { id: validated.id, localUserId: tokenInfo.id },
      }),
      prisma.modList.update({
        where: { id: validated.id },
        data: { subscriptionCount: { decrement: 1 } },
      }),
    ])
    return c.json({ code: 'success' })
  })
  .get('/subscribed', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const tokenInfo = c.get('tokenInfo')
    const modList = await prisma.modListSubscription.findMany({
      where: { localUserId: tokenInfo.id },
    })
    return c.json({ code: 'success', data: modList })
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
    const existingUser = await prisma.modListUser.count({
      where: {
        modListId: validated.modListId,
        twitterUserId: validated.twitterUser.id,
      },
    })
    if (existingUser > 0) {
      return c.json({ code: 'userAlreadyInModList' }, 400)
    }
    await upsertUser(prisma, validated.twitterUser)
    await prisma.$transaction([
      prisma.modListUser.create({
        data: {
          id: ulid(),
          modListId: validated.modListId,
          twitterUserId: validated.twitterUser.id,
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
      where: { id: validated.id },
    })
    if (!modListUser) {
      return c.json({ code: 'modListUserNotFound' }, 404)
    }
    const modList = await prisma.modList.findUnique({
      where: { id: modListUser.modListId, localUserId: tokenInfo.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    await prisma.$transaction([
      prisma.modListUser.delete({
        where: { id: validated.id },
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

const userQuerySchema = z.object({
  id: z.string(),
})

const modlistSearch = new Hono<HonoEnv>()
  .get('/search', zValidator('query', searchSchema), async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const modLists = await prisma.modList.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return c.json({ code: 'success', data: modLists })
  })
  // get modlist metadata by id
  .get('/get/:id', async (c) => {
    const id = c.req.param('id')
    const prisma = await prismaClients.fetch(c.env.DB)
    const modList = await prisma.modList.findUnique({
      where: { id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const tokenInfo = await getTokenInfo(c)
    const subscribed = tokenInfo
      ? (await prisma.modListSubscription.count({
          where: { modListId: id, localUserId: tokenInfo.id },
        })) > 0
      : false
    return c.json({
      code: 'success',
      data: {
        ...modList,
        subscribed,
      },
    })
  })
  // get modlist users by modlist id
  .get('/users', zValidator('query', userQuerySchema), async (c) => {
    const validated = c.req.valid('query')
    const prisma = await prismaClients.fetch(c.env.DB)
    const modList = await prisma.modList.findUnique({
      where: { id: validated.id },
    })
    if (!modList) {
      return c.json({ code: 'modListNotFound' }, 404)
    }
    const modListUsers = await prisma.modListUser.findMany({
      where: { modListId: validated.id },
    })
    return c.json({ code: 'success', data: modListUsers })
  })

export { modlists, modlistSearch }
