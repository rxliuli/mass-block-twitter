import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { llmRequestLog, tweet, user, userSpamAnalysis } from '../db/schema'
import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  InferSelectModel,
  isNotNull,
  isNull,
  like,
  lt,
  SQLWrapper,
} from 'drizzle-orm'
import { analyzeUser, LLMAnalyzed } from '../lib/llm'
import { ulid } from 'ulidx'
import { bearerAuth } from 'hono/bearer-auth'
import { getTableAliasedColumns } from '../lib/drizzle'
import { pageRequestSchema, PageResponse } from '../lib/page'
import { last } from 'es-toolkit'

const analyze = new Hono<HonoEnv>().use(
  bearerAuth({
    verifyToken: async (token, c: Context<HonoEnv>) => {
      return token === c.env.ADMIN_TOKEN
    },
  }),
)

const llmAnalyzeSchema = z.object({ userId: z.string() })
export type LlmAnalyzeRequest = z.infer<typeof llmAnalyzeSchema>
export type LlmAnalyzeResponse = LLMAnalyzed
analyze.post('/llm', zValidator('json', llmAnalyzeSchema), async (c) => {
  const { userId } = c.req.valid('json')
  const db = drizzle(c.env.DB)
  const _user = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .get()
  if (!_user) {
    return c.json({ code: 'user_not_found' }, 404)
  }
  if (
    await db
      .select({ id: userSpamAnalysis.id })
      .from(userSpamAnalysis)
      .where(eq(userSpamAnalysis.userId, userId))
      .get()
  ) {
    return c.json({ code: 'user_already_analyzed' }, 200)
  }
  const tweets = await db
    .select()
    .from(tweet)
    .where(eq(tweet.userId, userId))
    .orderBy(desc(tweet.publishedAt))
    .limit(3)
  const { result, logData } = await analyzeUser(
    {
      user: _user,
      tweets,
    },
    {
      baseUrl: c.env.OPENAI_BASE_URL,
      apiKey: c.env.OPENAI_API_KEY,
      model: c.env.OPENAI_MODEL,
    },
  )
  if (result) {
    const insertResult = await db
      .insert(userSpamAnalysis)
      .values({
        id: ulid(),
        userId,
        llmSpamRating: result.rating,
        llmSpamExplanation: result.explanation,
        llmAnalyzedAt: new Date().toISOString(),
      })
      .returning()
      .get()
    await db.insert(llmRequestLog).values({
      ...logData,
      relatedRecordId: insertResult.id,
      relatedRecordType: 'UserSpamAnalysis',
    })
    return c.json(result)
  } else {
    await db.insert(llmRequestLog).values(logData)
  }
  return c.json({ code: 'error' }, 500)
})

export type ReviewUsersResponse = PageResponse<{
  id: string
  screenName: string
  name: string
  status: 'unanalyzed' | 'unreviewed' | 'reviewed'
  followersCount: number
  llmSpamRating?: number | null
  llmSpamExplanation?: string | null
  isSpamByManualReview?: boolean
}>

const reviewUsersSchema = pageRequestSchema.extend({
  status: z.enum(['unanalyzed', 'unreviewed', 'reviewed']),
})
export type ReviewUsersRequest = z.infer<typeof reviewUsersSchema>
analyze.get('/users', zValidator('query', reviewUsersSchema), async (c) => {
  const db = drizzle(c.env.DB)
  const valid = c.req.valid('query')
  if (valid.status === 'unanalyzed') {
    const conditions: SQLWrapper[] = [
      isNull(userSpamAnalysis.userId),
      isNotNull(user.followersCount),
      isNotNull(user.followingCount),
      isNotNull(user.blueVerified),
    ]
    if (valid.cursor) {
      conditions.push(lt(user.id, valid.cursor))
    }
    const users = await db
      .select({
        User: getTableAliasedColumns(user),
      })
      .from(user)
      .leftJoin(userSpamAnalysis, eq(user.id, userSpamAnalysis.userId))
      // TODO: 逻辑上错误，但由于没有正确设置索引，所以只能如此😭
      // TODO: 正确的做法是 .orderBy(sql`CAST(${user.id} AS NUMERIC) DESC`)，但会导致大量行读取
      .orderBy(desc(user.id))
      .where(and(...conditions))
      .limit(valid.count ?? 50)
    return c.json<ReviewUsersResponse>({
      data: users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        followersCount: it.User.followersCount ?? 0,
        status: 'unanalyzed',
      })),
      cursor: last(users)?.User.id,
    })
  }
  if (valid.status === 'unreviewed') {
    const conditions: SQLWrapper[] = [
      isNull(userSpamAnalysis.isSpamByManualReview),
      gte(userSpamAnalysis.llmSpamRating, 5),
      lt(user.followersCount, 100),
    ]
    if (valid.cursor) {
      conditions.push(lt(userSpamAnalysis.id, valid.cursor))
    }
    const users = await db
      .select({
        UserSpamAnalysis: getTableAliasedColumns(userSpamAnalysis),
        User: getTableAliasedColumns(user),
      })
      .from(userSpamAnalysis)
      .innerJoin(user, eq(userSpamAnalysis.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(userSpamAnalysis.id))
      .limit(valid.count ?? 50)
    console.log(
      db
        .select({
          UserSpamAnalysis: getTableAliasedColumns(userSpamAnalysis),
          User: getTableAliasedColumns(user),
        })
        .from(userSpamAnalysis)
        .innerJoin(user, eq(userSpamAnalysis.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(userSpamAnalysis.id))
        .limit(valid.count ?? 50)
        .toSQL(),
    )
    return c.json<ReviewUsersResponse>({
      data: users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        followersCount: it.User.followersCount ?? 0,
        status: 'unreviewed',
        llmSpamRating: it.UserSpamAnalysis.llmSpamRating,
        llmSpamExplanation: it.UserSpamAnalysis.llmSpamExplanation,
        isSpamByManualReview: false,
      })),
      cursor: last(users)?.UserSpamAnalysis.id,
    })
  }
  if (valid.status === 'reviewed') {
    const conditions: SQLWrapper[] = [
      isNotNull(userSpamAnalysis.isSpamByManualReview),
    ]
    if (valid.cursor) {
      conditions.push(lt(userSpamAnalysis.id, valid.cursor))
    }
    const users = await db
      .select({
        UserSpamAnalysis: getTableAliasedColumns(userSpamAnalysis),
        User: getTableAliasedColumns(user),
      })
      .from(userSpamAnalysis)
      .innerJoin(user, eq(userSpamAnalysis.userId, user.id))
      .orderBy(desc(userSpamAnalysis.id))
      .where(and(...conditions))
      .limit(valid.count ?? 50)
    return c.json<ReviewUsersResponse>({
      data: users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        followersCount: it.User.followersCount ?? 0,
        status: 'reviewed',
        llmSpamRating: it.UserSpamAnalysis.llmSpamRating,
        llmSpamExplanation: it.UserSpamAnalysis.llmSpamExplanation,
        isSpamByManualReview: !!it.UserSpamAnalysis.isSpamByManualReview,
      })),
      cursor: last(users)?.UserSpamAnalysis.id,
    })
  }
  return c.json({ code: 'invalid_status' }, 400)
})
const markSpamSchema = z.object({
  userIds: z.array(z.string()),
  isSpamByManualReview: z.boolean(),
})
export type MarkSpamRequest = z.infer<typeof markSpamSchema>
analyze.post('/users/spam', zValidator('json', markSpamSchema), async (c) => {
  const db = drizzle(c.env.DB)
  const valid = c.req.valid('json')
  await db.batch(
    valid.userIds.map((it) =>
      db
        .insert(userSpamAnalysis)
        .values({
          id: ulid(),
          userId: it,
          isSpamByManualReview: valid.isSpamByManualReview,
          manualReviewedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: userSpamAnalysis.userId,
          set: {
            isSpamByManualReview: valid.isSpamByManualReview,
            manualReviewedAt: new Date().toISOString(),
          },
        }),
    ) as any,
  )
  return c.json({ code: 'success' })
})

export { analyze }
