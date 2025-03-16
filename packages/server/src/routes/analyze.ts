import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { llmRequestLog, tweet, user, userSpamAnalysis } from '../db/schema'
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  InferSelectModel,
  isNotNull,
  isNull,
  notInArray,
} from 'drizzle-orm'
import { analyzeUser, getPrompt, LLMAnalyzed } from '../lib/llm'
import { ulid } from 'ulidx'
import { bearerAuth } from 'hono/bearer-auth'
import { getTableAliasedColumns } from '../lib/drizzle'

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
  }
  await db.insert(llmRequestLog).values(logData)
  return c.json({ code: 'error' }, 500)
})

analyze.post('/scan', async (c) => {
  const db = drizzle(c.env.DB)
  const users = await db
    .select({
      id: user.id,
    })
    .from(user)
    .leftJoin(userSpamAnalysis, eq(user.id, userSpamAnalysis.userId))
    .where(isNull(userSpamAnalysis.id))
    .limit(10)
  await Promise.all(
    users.map(async (it) => {
      const resp = await analyze.request(
        '/llm',
        {
          method: 'POST',
          headers: {
            ...c.req.header(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: it.id }),
        },
        c.env,
        c.executionCtx,
      )
      if (!resp.ok) {
        throw resp
      }
    }),
  )
  return c.json({ code: 'success' })
})

const reviewSchema = z.object({
  userId: z.string(),
  isSpam: z.boolean(),
  notes: z.string().optional(),
})
export type ReviewRequest = z.infer<typeof reviewSchema>
analyze.post('/review', zValidator('json', reviewSchema), async (c) => {
  const db = drizzle(c.env.DB)
  const valid = c.req.valid('json')
  const user = await db
    .select()
    .from(userSpamAnalysis)
    .where(eq(userSpamAnalysis.userId, valid.userId))
    .limit(1)
    .get()
  if (!user) {
    return c.json({ code: 'user_not_found' }, 404)
  }
  await db
    .update(userSpamAnalysis)
    .set({
      isSpamByManualReview: valid.isSpam,
      manualReviewNotes: valid.notes,
      manualReviewedAt: new Date().toISOString(),
    })
    .where(eq(userSpamAnalysis.userId, valid.userId))
  return c.json({ code: 'success' })
})

export type ReviewUsersResponse = {
  id: string
  screenName: string
  name: string
  status: 'unanalyzed' | 'unreviewed' | 'reviewed'
  llmSpamRating: number
  llmSpamExplanation: string
  isSpamByManualReview: boolean
}[]

const reviewUsersSchema = z.object({
  status: z.enum(['unanalyzed', 'unreviewed', 'reviewed']),
})
export type ReviewUsersRequest = z.infer<typeof reviewUsersSchema>
analyze.get('/users', zValidator('query', reviewUsersSchema), async (c) => {
  const db = drizzle(c.env.DB)
  const valid = c.req.valid('query')
  if (valid.status === 'unanalyzed') {
    const users = await db
      .select({
        User: getTableAliasedColumns(user),
      })
      .from(user)
      .leftJoin(userSpamAnalysis, eq(user.id, userSpamAnalysis.userId))
      .where(
        and(
          isNull(userSpamAnalysis.userId),
          isNotNull(user.followersCount),
          isNotNull(user.followingCount),
          isNotNull(user.blueVerified),
        ),
      )
      .limit(100)
    return c.json(
      users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        status: 'unanalyzed',
        llmSpamRating: 0,
        llmSpamExplanation: '',
        isSpamByManualReview: false,
      })) satisfies ReviewUsersResponse,
    )
  }
  if (valid.status === 'unreviewed') {
    const users = await db
      .select({
        UserSpamAnalysis: getTableAliasedColumns(userSpamAnalysis),
        User: getTableAliasedColumns(user),
      })
      .from(userSpamAnalysis)
      .innerJoin(user, eq(userSpamAnalysis.userId, user.id))
      .where(
        and(
          isNull(userSpamAnalysis.isSpamByManualReview),
          gte(userSpamAnalysis.llmSpamRating, 4),
        ),
      )
      .orderBy(userSpamAnalysis.id)
      .limit(100)
    return c.json(
      users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        status: 'unreviewed',
        llmSpamRating: it.UserSpamAnalysis.llmSpamRating,
        llmSpamExplanation: it.UserSpamAnalysis.llmSpamExplanation,
        isSpamByManualReview: false,
      })) satisfies ReviewUsersResponse,
    )
  }
  if (valid.status === 'reviewed') {
    const users = await db
      .select({
        UserSpamAnalysis: getTableAliasedColumns(userSpamAnalysis),
        User: getTableAliasedColumns(user),
      })
      .from(userSpamAnalysis)
      .innerJoin(user, eq(userSpamAnalysis.userId, user.id))
      .orderBy(userSpamAnalysis.id)
      .where(isNotNull(userSpamAnalysis.isSpamByManualReview))
      .limit(100)
    return c.json(
      users.map((it) => ({
        id: it.User.id,
        screenName: it.User.screenName,
        name: it.User.name ?? it.User.screenName,
        status: 'reviewed',
        llmSpamRating: it.UserSpamAnalysis.llmSpamRating,
        llmSpamExplanation: it.UserSpamAnalysis.llmSpamExplanation,
        isSpamByManualReview: !!it.UserSpamAnalysis.isSpamByManualReview,
      })) satisfies ReviewUsersResponse,
    )
  }
  return c.json({ code: 'invalid_status' }, 400)
})

export type UserSpamAnalyze = InferSelectModel<typeof userSpamAnalysis>
analyze.get(
  '/get/:userId',
  zValidator(
    'param',
    z.object({
      userId: z.string(),
    }),
  ),
  async (c) => {
    const db = drizzle(c.env.DB)
    const valid = c.req.valid('param')
    const user = await db
      .select()
      .from(userSpamAnalysis)
      .where(eq(userSpamAnalysis.userId, valid.userId))
      .get()
    if (!user) {
      return c.json({ code: 'user_not_found' }, 404)
    }
    return c.json(user)
  },
)

export { analyze }
