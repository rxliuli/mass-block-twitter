import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { spamReportRequestSchema, tweetSchema, userSchema } from './lib/request'
import { prismaClients } from './lib/prisma'
import { HTTPException } from 'hono/http-exception'

type Bindings = {
  MY_KV: KVNamespace
  DB: D1Database

  APP_ENV?: 'development' | 'production'
}

const app = new Hono<{
  Bindings: Bindings
}>()

app
  .use(cors({ origin: 'x.com' }))
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
        const user = await prisma.user.findFirst({
          where: {
            id: userParams.id,
          },
        })
        if (!user) {
          await prisma.user.create({
            data: {
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
        } else {
          if (isSpam && !isReportThisUser) {
            user.spamReportCount += 1
          }
          await prisma.user.update({
            where: {
              id: userParams.id,
            },
            data: {
              ...user,
              screenName: userParams.screen_name,
              name: userParams.name,
              description: userParams.description,
              profileImageUrl: userParams.profile_image_url,
              accountCreatedAt: userParams.created_at
                ? new Date(userParams.created_at)
                : undefined,
              updatedAt: new Date(),
            },
          })
        }
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
  /** @deprecated Next Version Deprecated */
  .get('/spam-users', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const spamReportCounts = await prisma.user.findMany({
      select: {
        id: true,
        spamReportCount: true,
      },
      where: {
        spamReportCount: {
          gt: 0,
        },
      },
    })
    return c.json(
      spamReportCounts.reduce((acc, it) => {
        acc[it.id] = it.spamReportCount
        return acc
      }, {} as Record<string, number>),
    )
  })
  .get('/spam-users-for-type', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
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
    return c.json(
      spamReportCounts.reduce((acc, it) => {
        acc[it.id] = it.spamReportCount > 10 ? 'spam' : 'report'
        return acc
      }, {} as Record<string, 'report' | 'spam'>),
    )
  })
  .delete('/test/spam-users', async (c) => {
    if (c.env.APP_ENV !== 'development') {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
    const prisma = await prismaClients.fetch(c.env.DB)
    await prisma.spamReport.deleteMany()
    await prisma.tweet.deleteMany()
    await prisma.user.deleteMany()
    return c.json({ success: true })
  })

export default app
