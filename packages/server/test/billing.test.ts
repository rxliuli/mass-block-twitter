import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudflareTestContext, createCloudflareTestContext } from './utils'
import { CheckoutCompleteRequest } from '../src/lib'
import { PaddleTransaction } from '../src/routes/billing'

describe('billing', () => {
  let context: CloudflareTestContext
  beforeEach(async () => {
    context = await createCloudflareTestContext()
  })
  it('should be able to create a payment', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return Response.json({
        data: {
          id: 'test-transaction-id',
          details: {
            totals: { total: 100 },
          },
        },
      } satisfies PaddleTransaction)
    })
    const resp = await context.fetch('/api/billing/checkout/complete', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: 'test-transaction-id',
        countryCode: 'US',
      } satisfies CheckoutCompleteRequest),
      headers: {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp.status).toBe(200)
    const payment = await context.prisma.payment.findUnique({
      where: { id: 'test-transaction-id' },
    })
    expect(payment?.id).eq('test-transaction-id')
    const user = await context.prisma.localUser.findUnique({
      where: { id: 'test-user-1' },
    })
    expect(user?.isPro).true
  })
  it('should be able to handle a failed payment', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return Response.json(
        {
          data: {
            id: 'test-transaction-id',
            details: { totals: { total: 100 } },
          },
        } satisfies PaddleTransaction,
        { status: 400 },
      )
    })
    const resp = await context.fetch('/api/billing/checkout/complete', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: 'test-transaction-id',
        countryCode: 'US',
      } satisfies CheckoutCompleteRequest),
      headers: {
        Authorization: `Bearer ${context.token1}`,
        'Content-Type': 'application/json',
      },
    })
    expect(resp.status).toBe(500)
  })
})
