import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  ReportSpamContextTweet,
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
        const twitterUser = {
          id: userParams.id,
          screenName: userParams.screen_name,
          name: userParams.name,
          description: userParams.description,
          profileImageUrl: userParams.profile_image_url,
          accountCreatedAt: userParams.created_at,
          blueVerified: userParams.is_blue_verified,
          followersCount: userParams.followers_count,
          followingCount: userParams.friends_count,
          defaultProfile: userParams.default_profile,
          defaultProfileImage: userParams.default_profile_image,
        } as Parameters<typeof prisma.user.create>[0]['data']
        await prisma.user.upsert({
          where: {
            id: userParams.id,
          },
          update: {
            ...twitterUser,
            spamReportCount: {
              increment: isSpam && !isReportThisUser ? 1 : 0,
            },
          },
          create: {
            ...twitterUser,
            spamReportCount: isSpam ? 1 : 0,
          },
        })
      }
      function convertTweet(
        tweetParams: ReportSpamContextTweet,
      ): Parameters<typeof prisma.tweet.create>[0]['data'] {
        return {
          id: tweetParams.id,
          text: tweetParams.text,
          publishedAt: new Date(tweetParams.created_at),
          userId: validated.spamUser.id,
          media: tweetParams.media,
          conversationId: tweetParams.conversation_id_str,
          inReplyToStatusId: tweetParams.in_reply_to_status_id_str,
          quotedStatusId: tweetParams.quoted_status_id_str,
        }
      }
      async function createOrUpdateTweet(
        tweetParams: typeof tweetSchema._type,
      ) {
        const tweet = convertTweet(tweetParams)
        await prisma.tweet.upsert({
          where: {
            id: tweetParams.id,
          },
          update: {
            ...tweet,
            spamReportCount: {
              increment: 1,
            },
          },
          create: {
            ...tweet,
            spamReportCount: 1,
          },
        })
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
      async function createRelationTweetsAndUsers(
        relationTweets: NonNullable<
          TwitterSpamReportRequest['context']['relationTweets']
        >,
      ) {
        await Promise.all(
          relationTweets.map(async (it) => {
            const tweet = convertTweet(it.tweet)
            await prisma.tweet.upsert({
              where: {
                id: it.tweet.id,
              },
              update: tweet,
              create: tweet,
            })
            await createOrUpdateUser(it.user, false)
          }),
        )
      }
      await createOrUpdateUser(validated.spamUser, true)
      await createOrUpdateUser(validated.reportUser, false)
      await createOrUpdateTweet(validated.context.tweet)
      if (validated.context.relationTweets) {
        await createRelationTweetsAndUsers(validated.context.relationTweets)
      }
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
