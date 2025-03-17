import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  ReportSpamContextTweet,
  spamReportRequestSchema,
  tweetSchema,
  userSchema,
} from '../lib/request'
import { HonoEnv } from '../lib/bindings'
import { object, z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { spamReport, tweet, user, userSpamAnalysis } from '../db/schema'
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  InferInsertModel,
  InferSelectModel,
  isNotNull,
  sql,
} from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'
import { chunk, omit, uniqBy } from 'es-toolkit'

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
    location: userParams.location,
    url: userParams.url,
  }
}

const tweetSchemaWithUserId = tweetSchema.extend({
  user_id: z.string(),
})
function convertTweet(
  tweetParams: z.infer<typeof tweetSchemaWithUserId>,
): InferInsertModel<typeof tweet> {
  return {
    id: tweetParams.id,
    text: tweetParams.text,
    publishedAt: new Date(tweetParams.created_at).toISOString(),
    userId: tweetParams.user_id,
    media: tweetParams.media,
    conversationId: tweetParams.conversation_id_str,
    inReplyToStatusId: tweetParams.in_reply_to_status_id_str,
    quotedStatusId: tweetParams.quoted_status_id_str,
    lang: tweetParams.lang,
  }
}

const twitter = new Hono<HonoEnv>()

export type TwitterSpamReportRequest = z.infer<typeof spamReportRequestSchema>

export type TwitterUser = z.infer<typeof userSchema>

twitter
  .post(
    '/spam-users',
    // TODO: disable rate limit, wait https://github.com/rhinobase/hono-rate-limiter/issues/34
    // (c, next) =>
    //   rateLimiter({
    //     windowMs: 15 * 60 * 1000,
    //     limit: 100,
    //     standardHeaders: 'draft-6',
    //     keyGenerator: (c) =>
    //       `${c.header('x-real-ip')}::${c.header('user-agent')}`,
    //     store: new WorkersKVStore({
    //       namespace: c.env.MY_KV,
    //       prefix: 'rate-limit',
    //     }),
    //   })(c as Context, next),
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
        userParams: z.infer<typeof userSchema>,
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
              ...omit(twitterUser, ['id']),
              spamReportCount: sql`${user.spamReportCount} + ${
                isSpam && !isReportThisUser ? 1 : 0
              }`,
            },
          })
      }
      // TODO: update tweet must have userId
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
              ...omit(_tweet, ['id']),
              spamReportCount: sql`${tweet.spamReportCount} + 1`,
            },
          })
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
                set: omit(convertTweet(it), ['id']),
              }),
          ),
        ]
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
    if (!c.req.query('force')) {
      const spamUsers = await c.env.MY_KV.get('SpamUsers')
      if (spamUsers) {
        const { data, expireTime } = JSON.parse(spamUsers)
        if (Date.now() / 1000 < expireTime) {
          return c.json(data, {
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
    await c.env.MY_KV.put(
      'SpamUsers',
      JSON.stringify({
        data: res,
        expireTime: Date.now() / 1000 + 60 * 60 * 24,
      }),
      {
        expiration: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      },
    )
    return c.json(res)
  })

const checkSpamUserSchema = z.array(
  z.object({
    user: userSchema,
    tweets: z.array(tweetSchemaWithUserId),
  }),
)
export type CheckSpamUserRequest = z.infer<typeof checkSpamUserSchema>
export type CheckSpamUserResponse = Pick<
  InferSelectModel<typeof userSpamAnalysis>,
  'userId' | 'isSpamByManualReview'
>[]
twitter.post(
  '/spam-users/check',
  zValidator('json', checkSpamUserSchema),
  async (c) => {
    const validated = c.req.valid('json')
    const db = drizzle(c.env.DB)
    for (const item of chunk(validated, 100)) {
      await db.batch([
        ...item.map((it) => {
          const _user = convertUserParamsToDBUser(it.user)
          return db
            .insert(user)
            .values(_user)
            .onConflictDoUpdate({
              target: user.id,
              set: omit(_user, ['id']),
            })
        }),
        ...item.flatMap((userParam) =>
          userParam.tweets.map((it) => {
            const _tweet = convertTweet({
              ...it,
              user_id: userParam.user.id,
            })
            return db
              .insert(tweet)
              .values(_tweet)
              .onConflictDoUpdate({
                target: tweet.id,
                set: omit(_tweet, ['id']),
              })
          }),
        ),
      ] as any)
    }

    const spamAnalysis = await db
      .select({
        userId: userSpamAnalysis.userId,
        isSpamByManualReview: userSpamAnalysis.isSpamByManualReview,
      })
      .from(userSpamAnalysis)
      .where(
        and(
          inArray(
            userSpamAnalysis.userId,
            // TODO: why d1 can't inArray query more than 100 params?
            validated.slice(0, 99).map((it) => it.user.id),
          ),
          eq(userSpamAnalysis.isSpamByManualReview, true),
        ),
      )
    return c.json(spamAnalysis satisfies CheckSpamUserResponse)
  },
)

export { twitter }
