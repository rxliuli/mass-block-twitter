import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  ReportSpamContextTweet,
  spamReportRequestSchema,
  tweetSchema,
  userSchema,
} from '../lib/request'
import { HonoEnv } from '../lib/bindings'
import { z } from 'zod'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1'
import { spamReport, tweet, user, userSpamAnalysis } from '../db/schema'
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  InferInsertModel,
  InferSelectModel,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm'
import { BatchItem } from 'drizzle-orm/batch'
import { chunk, groupBy, omit, uniqBy } from 'es-toolkit'
import { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core'
import { safeChunkInsertValues } from '../lib/drizzle'

export function upsertTweet(
  db: DrizzleD1Database<Record<string, never>> & {
    $client: D1Database
  },
  _tweet: InferInsertModel<typeof tweet>,
) {
  return db
    .insert(tweet)
    .values(_tweet)
    .onConflictDoUpdate({
      target: tweet.id,
      set: omit(_tweet, ['id']),
      setWhere: and(
        isNull(tweet.conversationId),
        sql`${_tweet.conversationId ?? null} IS NOT NULL`,
      ),
    })
}

export function upsertUser(
  db: DrizzleD1Database<Record<string, never>> & {
    $client: D1Database
  },
  _user: InferInsertModel<typeof user>,
  _updated?: SQLiteUpdateSetSource<typeof user>,
) {
  return db
    .insert(user)
    .values(_user)
    .onConflictDoUpdate({
      target: user.id,
      set: _updated ? omit(_updated, ['id']) : omit(_user, ['id']),
      setWhere: and(
        or(
          isNull(user.followersCount),
          isNull(user.followingCount),
          // 24 hours ago
          lt(
            user.updatedAt,
            new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          ),
        ),
        sql`${_user.followersCount ?? null} IS NOT NULL`,
        sql`${_user.followingCount ?? null} IS NOT NULL`,
      ),
    })
}

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
  // conversation_id_str: z.string(),
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
              'Cache-Control': 'public, max-age=86400',
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

export async function upsertUsers(
  db: DrizzleD1Database,
  users: InferInsertModel<typeof user>[],
): Promise<BatchItem<'sqlite'>[]> {
  const existingUsers = await db
    .select()
    .from(user)
    .where(
      inArray(
        user.id,
        users.map((it) => it.id),
      ),
    )
  const existingUsersMap = existingUsers.reduce((acc, it) => {
    acc[it.id] = it
    return acc
  }, {} as Record<string, InferSelectModel<typeof user>>)
  const usersToProcessGroupBy = groupBy(users, (it) => {
    const old = existingUsersMap[it.id]
    if (!old) {
      return 'new'
    }
    if (
      typeof it.followersCount !== 'number' ||
      typeof it.followingCount !== 'number'
    ) {
      return 'skip'
    }
    if (old.followersCount === null || old.followingCount === null) {
      return 'update'
    }
    if (
      it.updatedAt &&
      it.updatedAt < new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    ) {
      return 'update'
    }
    return 'skip'
  })
  const list: BatchItem<'sqlite'>[] = []
  if (usersToProcessGroupBy['new']) {
    list.push(
      ...safeChunkInsertValues(user, usersToProcessGroupBy['new']).map((it) =>
        db.insert(user).values(it).onConflictDoNothing({
          target: user.id,
        }),
      ),
    )
  }
  if (usersToProcessGroupBy['update']) {
    list.push(
      ...usersToProcessGroupBy['update'].map((it) =>
        db
          .update(user)
          .set(omit(it, ['id']))
          .where(eq(user.id, it.id)),
      ),
    )
  }
  return list
}
export async function upsertTweets(
  db: DrizzleD1Database,
  tweets: InferInsertModel<typeof tweet>[],
) {
  const existingTweets = (
    await Promise.all(
      chunk(
        tweets.map((it) => it.id),
        99,
      ).map((ids) => db.select().from(tweet).where(inArray(tweet.id, ids))),
    )
  ).flatMap((it) => it)
  const tweetsMap = existingTweets.reduce((acc, it) => {
    acc[it.id] = it
    return acc
  }, {} as Record<string, InferSelectModel<typeof tweet>>)
  const tweetsToProcessGroupBy = groupBy(tweets, (it) => {
    const old = tweetsMap[it.id]
    if (!old) {
      return 'new'
    }
    if (!old.conversationId && it.conversationId) {
      return 'update'
    }
    return 'skip'
  })
  const list: BatchItem<'sqlite'>[] = []
  if (tweetsToProcessGroupBy['new']) {
    list.push(
      ...safeChunkInsertValues(tweet, tweetsToProcessGroupBy['new']).map((it) =>
        db.insert(tweet).values(it).onConflictDoNothing({
          target: tweet.id,
        }),
      ),
    )
  }
  if (tweetsToProcessGroupBy['update']) {
    list.push(
      ...tweetsToProcessGroupBy['update'].map((it) =>
        db
          .update(tweet)
          .set(omit(it, ['id']))
          .where(eq(tweet.id, it.id)),
      ),
    )
  }
  return list
}
const checkSpamUserSchema = z
  .array(
    z.object({
      user: userSchema,
      tweets: z.array(tweetSchemaWithUserId),
    }),
  )
  .min(1)
  .max(99)
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
    const usersToProcess = validated.map((it) =>
      convertUserParamsToDBUser(it.user),
    )
    const tweetsToProcess = validated.flatMap((it) =>
      it.tweets.map((userParam) =>
        convertTweet({ ...userParam, user_id: it.user.id }),
      ),
    )
    const list = (
      await Promise.all([
        upsertUsers(db, usersToProcess),
        upsertTweets(db, tweetsToProcess),
      ])
    ).flat()

    if (list.length > 0) {
      await db.batch(list as any)
    }

    // for (const item of chunk(validated, 100)) {
    //   await db.batch([
    //     ...item.map((it) => {
    //       const _user = convertUserParamsToDBUser(it.user)
    //       return upsertUser(db, _user)
    //     }),
    //     ...item.flatMap((userParam) =>
    //       userParam.tweets.map((it) => {
    //         const _tweet = convertTweet({
    //           ...it,
    //           user_id: userParam.user.id,
    //         })
    //         return upsertTweet(db, _tweet)
    //       }),
    //     ),
    //   ] as any)
    // }

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
            validated.map((it) => it.user.id),
          ),
          eq(userSpamAnalysis.isSpamByManualReview, true),
        ),
      )
    return c.json(spamAnalysis satisfies CheckSpamUserResponse)
  },
)

export { twitter }
