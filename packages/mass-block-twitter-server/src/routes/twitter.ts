import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  spamReportRequestSchema,
  tweetSchema,
  userSchema,
} from '../lib/request'
import { prismaClients } from '../lib/prisma'
import { HonoEnv } from '../lib/bindings'
import { z } from 'zod'

const twitter = new Hono<HonoEnv>()

export type TwitterSpamReportRequest = z.infer<typeof spamReportRequestSchema>

export type TwitterUser = z.infer<typeof userSchema>

twitter
  .post(
    '/spam-users',
    zValidator('json', spamReportRequestSchema),
    async (c) => {
      const validated = c.req.valid('json')
      const prisma = await prismaClients.fetch(c.env.DB)
      const isReportThisUser =
        (await prisma.spamReport.count({
          where: {
            AND: [
              { spamUserId: validated.spamUser.id },
              { reportUserId: validated.reportUser.id },
            ],
          },
        })) > 0
      async function createOrUpdateUser(
        userParams: typeof userSchema._type,
        isSpam: boolean,
      ) {
        const r = await prisma.user.upsert({
          where: {
            id: userParams.id,
          },
          update: {
            screenName: userParams.screen_name,
            name: userParams.name,
            description: userParams.description,
            profileImageUrl: userParams.profile_image_url,
            accountCreatedAt: userParams.created_at
              ? new Date(userParams.created_at)
              : undefined,
            updatedAt: new Date(),
            spamReportCount: {
              increment: isSpam && !isReportThisUser ? 1 : 0,
            },
          },
          create: {
            id: userParams.id,
            screenName: userParams.screen_name,
            name: userParams.name,
            description: userParams.description,
            profileImageUrl: userParams.profile_image_url,
            accountCreatedAt: userParams.created_at
              ? new Date(userParams.created_at)
              : undefined,
            spamReportCount: isSpam ? 1 : 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }
      async function createOrUpdateTweet(
        tweetParams: typeof tweetSchema._type,
      ) {
        const tweet = await prisma.tweet.findFirst({
          where: {
            id: tweetParams.id,
          },
        })
        if (!tweet) {
          await prisma.tweet.create({
            data: {
              id: tweetParams.id,
              text: tweetParams.text,
              publishedAt: new Date(tweetParams.created_at),
              userId: validated.spamUser.id,
              media: tweetParams.media,
              spamReportCount: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
        } else {
          await prisma.tweet.update({
            where: {
              id: tweetParams.id,
            },
            data: {
              ...tweet,
              text: tweetParams.text,
              publishedAt: new Date(tweetParams.created_at),
              media: tweetParams.media,
              spamReportCount: tweet.spamReportCount + 1,
              updatedAt: new Date(),
            },
          })
        }
      }
      async function createSpamReport(
        validated: typeof spamReportRequestSchema._type,
      ) {
        const spamReport = await prisma.spamReport.findFirst({
          where: {
            AND: [
              { spamUserId: validated.spamUser.id },
              { reportUserId: validated.reportUser.id },
              { spamTweetId: validated.context.tweet.id },
            ],
          },
        })
        if (spamReport) {
          return
        }
        await prisma.spamReport.create({
          data: {
            spamUserId: validated.spamUser.id,
            reportUserId: validated.reportUser.id,
            spamTweetId: validated.context.tweet.id,
            pageType: validated.context.page_type,
            pageUrl: validated.context.page_url,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }
      await createOrUpdateUser(validated.reportUser, false)
      await createOrUpdateUser(validated.spamUser, true)
      await createOrUpdateTweet(validated.context.tweet)
      await createSpamReport(validated)
      return c.json({ success: true })
    },
  )
  .get('/spam-users-for-type', async (c) => {
    const spamUsersExpireTime = await c.env.MY_KV.get('spamUsersExpireTime')
    if (!c.req.query('force') && spamUsersExpireTime) {
      const time = new Date(spamUsersExpireTime)
      if (Date.now() < time.getTime()) {
        const spamUsers = await c.env.MY_KV.get('spamUsers')
        if (spamUsers) {
          return c.json(JSON.parse(spamUsers), {
            headers: {
              'Cache-Control': 'public, max-age=3600',
            },
          })
        }
      }
    }
    const prisma = await prismaClients.fetch(c.env.DB)
    // TODO: use index
    const spamReportCounts = await prisma.user.findMany({
      select: {
        id: true,
        spamReportCount: true,
      },
      where: {
        spamReportCount: {
          gte: 1,
        },
      },
    })
    const res = spamReportCounts.reduce((acc, it) => {
      acc[it.id] = it.spamReportCount > 10 ? 'spam' : 'report'
      return acc
    }, {} as Record<string, 'spam' | 'report'>)
    await c.env.MY_KV.put('spamUsers', JSON.stringify(res))
    await c.env.MY_KV.put(
      'spamUsersExpireTime',
      new Date(Date.now() + +1000 * 60 * 60 * 24).toISOString(),
    )
    return c.json(res)
  })

export { twitter }
