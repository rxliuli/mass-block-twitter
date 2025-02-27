import { Context, Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  ReportSpamContextTweet,
  spamReportRequestSchema,
  tweetSchema,
  userSchema,
} from '../lib/request'
import { HonoEnv } from '../lib/bindings'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { spamReport, tweet, user } from '../db/schema'
import { and, desc, eq, gte, InferInsertModel, sql } from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'
import { uniqBy } from 'lodash-es'
import { rateLimiter } from 'hono-rate-limiter'
import { WorkersKVStore } from '@hono-rate-limiter/cloudflare'

export function convertUserParamsToDBUser(
  userParams: typeof userSchema._type,
): InferInsertModel<typeof user> {
  return {
    id: userParams.id,
    screenName: userParams.screen_name,
    name: userParams.name,
    description: userParams.description,
    profileImageUrl: userParams.profile_image_url,
    accountCreatedAt: userParams.created_at
      ? new Date(userParams.created_at).toISOString()
      : undefined,
    blueVerified: userParams.is_blue_verified,
    followersCount: userParams.followers_count,
    followingCount: userParams.friends_count,
    defaultProfile: userParams.default_profile,
    defaultProfileImage: userParams.default_profile_image,
  }
}

const twitter = new Hono<HonoEnv>()

export type TwitterSpamReportRequest = z.infer<typeof spamReportRequestSchema>

export type TwitterUser = z.infer<typeof userSchema>

twitter
  .post(
    '/spam-users',
    (c, next) =>
      rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: 'draft-6',
        keyGenerator: (c) =>
          `${c.header('x-real-ip')}::${c.header('user-agent')}`,
        store: new WorkersKVStore({
          namespace: c.env.MY_KV,
          prefix: 'rate-limit',
        }),
      })(c as Context, next),
    zValidator('json', spamReportRequestSchema),
    async (c) => {
      const validated = c.req.valid('json')
      const db = drizzle(c.env.DB)
      const isReportThisUser =
        (
          await db
            .select()
            .from(spamReport)
            .where(
              and(
                eq(spamReport.spamUserId, validated.spamUser.id),
                eq(spamReport.reportUserId, validated.reportUser.id),
              ),
            )
            .limit(1)
        ).length > 0
      function createOrUpdateUser(
        userParams: typeof userSchema._type,
        isSpam: boolean,
      ) {
        const twitterUser = convertUserParamsToDBUser(userParams)
        return db
          .insert(user)
          .values({
            ...twitterUser,
            spamReportCount: isSpam ? 1 : 0,
          })
          .onConflictDoUpdate({
            target: user.id,
            set: {
              ...twitterUser,
              spamReportCount: sql`${user.spamReportCount} + ${
                isSpam && !isReportThisUser ? 1 : 0
              }`,
            },
          })
      }
      function convertTweet(
        tweetParams: ReportSpamContextTweet,
      ): InferInsertModel<typeof tweet> {
        return {
          id: tweetParams.id,
          text: tweetParams.text,
          publishedAt: new Date(tweetParams.created_at).toISOString(),
          userId: validated.spamUser.id,
          media: tweetParams.media,
          conversationId: tweetParams.conversation_id_str,
          inReplyToStatusId: tweetParams.in_reply_to_status_id_str,
          quotedStatusId: tweetParams.quoted_status_id_str,
          lang: tweetParams.lang,
        }
      }
      function createOrUpdateTweet(tweetParams: typeof tweetSchema._type) {
        const _tweet = convertTweet(tweetParams)
        return db
          .insert(tweet)
          .values({
            ..._tweet,
            spamReportCount: 1,
          })
          .onConflictDoUpdate({
            target: tweet.id,
            set: {
              ..._tweet,
              spamReportCount: sql`${tweet.spamReportCount} + 1`,
            },
          })
        // await prisma.tweet.upsert({
        //   where: {
        //     id: tweetParams.id,
        //   },
        //   update: {
        //     ..._tweet,
        //     spamReportCount: {
        //       increment: 1,
        //     },
        //   },
        //   create: {
        //     ..._tweet,
        //     spamReportCount: 1,
        //   },
        // })
      }
      const _spamReport = await db
        .select({
          id: spamReport.id,
        })
        .from(spamReport)
        .where(
          and(
            eq(spamReport.spamUserId, validated.spamUser.id),
            eq(spamReport.reportUserId, validated.reportUser.id),
            eq(spamReport.spamTweetId, validated.context.tweet.id),
          ),
        )
        .limit(1)
        .get()
      // const _spamReport = await prisma.spamReport.findFirst({
      //   where: {
      //     AND: [
      //       { spamUserId: validated.spamUser.id },
      //       { reportUserId: validated.reportUser.id },
      //       { spamTweetId: validated.context.tweet.id },
      //     ],
      //   },
      // })
      function createSpamReport(
        validated: typeof spamReportRequestSchema._type,
      ) {
        return db.insert(spamReport).values({
          spamUserId: validated.spamUser.id,
          reportUserId: validated.reportUser.id,
          spamTweetId: validated.context.tweet.id,
          pageType: validated.context.page_type,
          pageUrl: validated.context.page_url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        // await prisma.spamReport.create({
        //   data: {
        //     spamUserId: validated.spamUser.id,
        //     reportUserId: validated.reportUser.id,
        //     spamTweetId: validated.context.tweet.id,
        //     pageType: validated.context.page_type,
        //     pageUrl: validated.context.page_url,
        //     createdAt: new Date(),
        //     updatedAt: new Date(),
        //   },
        // })
      }
      function createRelationTweetsAndUsers(
        relationTweets: NonNullable<
          TwitterSpamReportRequest['context']['relationTweets']
        >,
      ) {
        const users = uniqBy(
          relationTweets.map((it) => it.user),
          (it) => it.id,
        )
        const tweets = uniqBy(
          relationTweets.map((it) => it.tweet),
          (it) => it.id,
        )
        return [
          ...users.map((it) => createOrUpdateUser(it, false)),
          ...tweets.map((it) =>
            db
              .insert(tweet)
              .values(convertTweet(it))
              .onConflictDoUpdate({
                target: tweet.id,
                set: convertTweet(it),
              }),
          ),
        ]
        // await Promise.all(
        //   relationTweets.map(async (it) => {
        //     const tweet = convertTweet(it.tweet)
        //     await prisma.tweet.upsert({
        //       where: {
        //         id: it.tweet.id,
        //       },
        //       update: tweet,
        //       create: tweet,
        //     })
        //     await createOrUpdateUser(it.user, false)
        //   }),
        // )
      }
      const list: BatchItem<'sqlite'>[] = [
        createOrUpdateUser(validated.spamUser, true),
        createOrUpdateUser(validated.reportUser, false),
        createOrUpdateTweet(validated.context.tweet),
      ]
      if (!_spamReport) {
        list.push(createSpamReport(validated))
      }
      if (validated.context.relationTweets) {
        list.push(
          ...createRelationTweetsAndUsers(validated.context.relationTweets),
        )
      }
      await db.batch(list as any)
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
    const db = drizzle(c.env.DB)
    const spamReportCounts = await db
      .select({
        id: user.id,
        spamReportCount: user.spamReportCount,
      })
      .from(user)
      .where(gte(user.spamReportCount, 1))
      .orderBy(desc(user.spamReportCount))
      .limit(1000)
      .all()
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
