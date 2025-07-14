import { describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { FeedbackRequest } from '../src/lib'
import { feedback } from '../src/db/schema'

const c = initCloudflareTest()

describe('feedback', () => {
  const req: FeedbackRequest = {
    reason: 'missing',
    email: 'test@test.com',
    context: {
      os: 'windows',
      browser: 'chrome',
      screensize: { width: 100, height: 100 },
      language: 'en',
      timezone: 'America/New_York',
      numberOfCPUs: 1,
      deviceType: 'desktop',
    },
  }
  it('should create a feedback', async () => {
    const resp = await fetch('/api/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(resp.ok).true
    const feedbacks = await c.db.select().from(feedback)
    expect(feedbacks).length(1)
    expect(feedbacks[0].reason).toBe('missing')
    expect(feedbacks[0].suggestion).toBeNull()
    expect(feedbacks[0].localUserId).null
  })
  it('should not create a feedback if the user is not logged in', async () => {
    const resp = await fetch('/api/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${c.token1}`,
      },
    })
    expect(resp.ok).true
    const feedbacks = await c.db.select().from(feedback)
    expect(feedbacks).length(1)
    expect(feedbacks[0].localUserId).eq('test-user-1')
  })
  it('should create a feedback with full fields', async () => {
    const resp = await fetch('/api/feedback/submit', {
      method: 'POST',
      body: JSON.stringify({
        ...req,
        reason: 'broken',
        suggestion: 'test',
        email: 'test@test.com',
      } satisfies FeedbackRequest),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(resp.ok).true
    const feedbacks = await c.db.select().from(feedback)
    expect(feedbacks).length(1)
    expect(feedbacks[0].reason).toBe('broken')
    expect(feedbacks[0].suggestion).toBe('test')
    expect(feedbacks[0].email).toBe('test@test.com')
  })
})
