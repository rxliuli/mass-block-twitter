import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudflareTestContext, createCloudflareTestContext } from './utils'
import { llmRequestLog, user, userSpamAnalysis } from '../src/db/schema'
import { LLMAnalyzed } from '../src/lib/llm'
import {
  ReviewRequest,
  ReviewUsersRequest,
  ReviewUsersResponse,
  UserSpamAnalyze,
} from '../src/lib'
import { eq } from 'drizzle-orm'

let c: CloudflareTestContext
beforeEach(async () => {
  c = await createCloudflareTestContext()
})
describe('analyze', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (
        [
          'https://api.deepseek.com/chat/completions',
          'https://api.x.ai/v1/chat/completions',
          'https://api.openai.com/v1/chat/completions',
        ].includes(url.toString())
      ) {
        return new Response(
          JSON.stringify({
            id: 'ec6d3c05-a178-4cc0-a966-d9f39d65d940',
            object: 'chat.completion',
            created: 1741948295,
            model: 'deepseek-chat',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify({
                    rating: 4,
                    explanation: 'test',
                  } as LLMAnalyzed),
                },
                logprobs: null,
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 11,
              completion_tokens: 11,
              total_tokens: 22,
              prompt_tokens_details: { cached_tokens: 0 },
              prompt_cache_hit_tokens: 0,
              prompt_cache_miss_tokens: 11,
            },
            system_fingerprint: 'fp_3a5770e1b4_prod0225',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
      return c.fetch(url, options)
    })
  })
  const getReviewUsers = async (status: ReviewUsersRequest['status']) => {
    const resp = await fetch(`/api/analyze/users?status=${status}`, {
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
      },
    })
    expect(resp.ok).true
    return (await resp.json()) as ReviewUsersResponse
  }
  it('should analyze', async () => {
    await c.db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-user-1',
        name: 'test-user-1',
        url: 'https://test.com',
        profileImageUrl: 'https://test.com',
      },
      {
        id: 'test-user-2',
        screenName: 'test-user-2',
        name: 'test-user-2',
      },
    ])
    expect(await c.db.$count(user)).eq(2)
    expect(await c.db.$count(userSpamAnalysis)).eq(0)
    const resp1 = await fetch('/api/analyze/llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-1' }),
    })
    expect(resp1.ok).true
    expect(await c.db.$count(userSpamAnalysis)).eq(1)
    const resp2 = await fetch('/api/analyze/scan', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
      },
    })
    expect(resp2.ok).true
    expect(await c.db.$count(userSpamAnalysis)).eq(2)
    const r3 = await getReviewUsers('unreviewed')
    expect(r3.total).eq(2)
    expect(
      r3.users.map((it) => it.id).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['test-user-1', 'test-user-2'])
    expect((await getReviewUsers('reviewed')).total).eq(0)
    const resp4 = await fetch('/api/analyze/review', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: r3.users[0].id,
        isSpam: true,
        notes: 'test',
      } satisfies ReviewRequest),
    })
    expect(resp4.ok).true
    const r5 = await c.db
      .select()
      .from(userSpamAnalysis)
      .where(eq(userSpamAnalysis.userId, r3.users[0].id))
      .get()
    assert(r5)
    expect(r5.isSpamByManualReview).true
    expect(r5.manualReviewNotes).eq('test')
    const r6 = await getReviewUsers('unreviewed')
    expect(r6.total).eq(1)
    expect(
      r6.users.map((it) => it.id).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['test-user-2'])
    expect((await getReviewUsers('reviewed')).total).eq(1)
  })
  it('should not allow review user not found', async () => {
    const resp1 = await fetch('/api/analyze/review', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-3',
        isSpam: true,
        notes: 'test',
      } satisfies ReviewRequest),
    })
    expect(resp1.status).eq(404)
  })
  it('should get unanalyzed users', async () => {
    await c.db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-user-1',
        name: 'test-user-1',
      },
    ])
    expect(await c.db.$count(user)).eq(1)
    expect((await getReviewUsers('unanalyzed')).total).eq(1)
    expect((await getReviewUsers('unreviewed')).total).eq(0)
    const resp1 = await fetch('/api/analyze/llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-1' }),
    })
    expect(resp1.ok).true
    expect((await getReviewUsers('unanalyzed')).total).eq(0)
    expect((await getReviewUsers('unreviewed')).total).eq(1)
  })
  it('should get user spam analyze', async () => {
    await c.db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-user-1',
        name: 'test-user-1',
      },
    ])
    const resp1 = await fetch('/api/analyze/llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-1' }),
    })
    expect(resp1.ok).true
    const resp2 = await fetch(`/api/analyze/get/test-user-1`, {
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
      },
    })
    expect(resp2.ok).true
    const r2 = (await resp2.json()) as UserSpamAnalyze
    expect(r2.userId).eq('test-user-1')
    expect(r2.llmSpamRating).eq(4)
    expect(r2.llmSpamExplanation).eq('test')
    expect(r2.isSpamByManualReview).null
    expect(r2.manualReviewNotes).null
  })
  it('should get llm request log', async () => {
    await c.db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-user-1',
        name: 'test-user-1',
      },
    ])
    const resp1 = await fetch('/api/analyze/llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-1' }),
    })
    expect(resp1.ok).true
    const list = await c.db.select().from(llmRequestLog).all()
    expect(list).length(1)
    expect(list[0].userId).eq('test-user-1')
    expect(list[0].requestType).eq('spam_detection')
    expect(list[0].modelName).eq('deepseek-chat')
    expect(list[0].requestTimestamp).not.null
    expect(list[0].responseTimestamp).not.null
    expect(list[0].latencyMs).not.null
  })
  it('should get unreviewed users not includes reviewed users', async () => {
    await c.db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-screen-name-1',
        name: 'test-name-1',
      },
    ])
    const resp1 = await fetch('/api/analyze/llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-1' }),
    })
    expect(resp1.ok).true
    const r1 = await getReviewUsers('unreviewed')
    expect(r1.total).eq(1)
    expect(r1.users[0].id).eq('test-user-1')
    const resp2 = await fetch('/api/analyze/review', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-1',
        isSpam: true,
        notes: 'test',
      } satisfies ReviewRequest),
    })
    expect(resp2.ok).true
    const r2 = await getReviewUsers('unreviewed')
    expect(r2.total).eq(0)
    const r3 = await getReviewUsers('reviewed')
    expect(r3.total).eq(1)
  })
})
