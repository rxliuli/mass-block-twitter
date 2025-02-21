import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { prismaClients } from '../lib/prisma'

const billing = new Hono<HonoEnv>()

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
    const prisma = await prismaClients.fetch(c.env.DB)
    const transaction = (await resp.json()) as PaddleTransaction
    // await prisma.$transaction([
    //   prisma.payment.create({
    //     data: {
    //       id: transaction.data.id,
    //       type: 'subscription',
    //       amount: transaction.data.details.totals.total / 100,
    //       status: 'success',
    //       localUserId: tokenInfo.id,
    //       countryCode,
    //     },
    //   }),
    //   prisma.localUser.update({
    //     data: { isPro: true },
    //     where: { id: tokenInfo.id },
    //   }),
    // ])
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO payment (id, type, amount, status, localUserId, countryCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        transaction.data.id,
        'subscription',
        transaction.data.details.totals.total / 100,
        'success',
        tokenInfo.sub,
        countryCode,
        new Date().toISOString(),
        new Date().toISOString(),
      ),
      c.env.DB.prepare('UPDATE localUser SET isPro = true WHERE id = ?').bind(
        tokenInfo.sub,
      ),
    ])
    return c.json({ message: 'Payment created' })
  },
)

export { billing }
