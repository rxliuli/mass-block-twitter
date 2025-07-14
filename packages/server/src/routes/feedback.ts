import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { feedback } from '../db/schema'
import { getTokenInfo } from '../middlewares/auth'
import { useDB } from '../lib/drizzle'

const feedbackRoute = new Hono<HonoEnv>().use(useDB())

const feedbackSchema = z.object({
  reason: z.enum(['missing', 'broken', 'confused', 'alternative', 'other']),
  suggestion: z.string().optional(),
  email: z.string().email(),
  context: z.object({
    os: z.enum(['windows', 'macos', 'linux', 'ios', 'android', 'other']),
    browser: z.enum(['chrome', 'firefox', 'edge', 'safari', 'other']),
    screensize: z.object({
      width: z.number(),
      height: z.number(),
    }),
    language: z.string(),
    timezone: z.string(),
    numberOfCPUs: z.number(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet', 'other']),
  }),
})
export type FeedbackRequest = z.infer<typeof feedbackSchema>

feedbackRoute.post('/submit', zValidator('json', feedbackSchema), async (c) => {
  const db = c.get('db')
  const validated = await c.req.json()
  const tokenInfo = await getTokenInfo(c)
  await db.insert(feedback).values({
    ...validated,
    localUserId: tokenInfo?.sub,
  })
  return c.json({ success: true })
})

export { feedbackRoute as feedback }
