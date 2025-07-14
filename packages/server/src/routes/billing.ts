import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { payment, localUser } from '../db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '../middlewares/auth'
import { useDB } from '../lib/drizzle'

const billing = new Hono<HonoEnv>().use(auth()).use(useDB())

const checkoutCompleteRequestSchema = z.object({
  transactionId: z.string(),
  countryCode: z.string(),
})
export type CheckoutCompleteRequest = z.infer<
  typeof checkoutCompleteRequestSchema
>

export interface PaddleTransaction {
  data: {
    id: string
    details: {
      totals: {
        total: number
      }
    }
  }
}

billing.post(
  '/checkout/complete',
  zValidator('json', checkoutCompleteRequestSchema),
  async (c) => {
    const { transactionId, countryCode } = c.req.valid('json')
    const tokenInfo = c.get('jwtPayload')
    const resp = await fetch(
      c.env.PADDEL_API_URL + '/transactions/' + transactionId,
      {
        headers: {
          Authorization: `Bearer ${c.env.PADDEL_API_KEY}`,
        },
      },
    )
    if (!resp.ok) {
      console.error('Failed to create payment', await resp.json())
      return c.json({ message: 'Failed to create payment' }, 500)
    }
    const db = c.get('db')
    const transaction = (await resp.json()) as PaddleTransaction
    await db.transaction(async (tx) => {
      await Promise.all([
        tx.insert(payment).values({
          id: transaction.data.id,
          type: 'subscription',
          amount: transaction.data.details.totals.total / 100,
          status: 'success',
          localUserId: tokenInfo.sub,
          countryCode,
        }),
        tx
          .update(localUser)
          .set({ isPro: true })
          .where(eq(localUser.id, tokenInfo.sub)),
      ])
    })
    return c.json({ code: 'success' })
  },
)

export { billing }
