import { assert, describe, expect, it, vi } from 'vitest'
import type {
  CheckSpamUserRequest,
  CheckSpamUserResponse,
  TwitterSpamReportRequest,
} from '../src/lib'
import { initCloudflareTest } from './utils'
import { tweet, user, userSpamAnalysis } from '../src/db/schema'
import { eq, gt } from 'drizzle-orm'
import { range } from 'es-toolkit'
import { upsertTweets, upsertUsers } from '../src/routes/twitter'

let c = initCloudflareTest()

const getSpamRequest = (
  spamUserId: string,
  reportUserId: string,
  tweetId: string,
): TwitterSpamReportRequest => {
  return {
    spamUser: {
      id: spamUserId,
      screen_name: `test ${spamUserId}`,
      name: `test ${spamUserId}`,
      description: `test ${spamUserId}`,
      profile_image_url: `test ${spamUserId}`,
      created_at: new Date().toISOString(),
      is_blue_verified: false,
      followers_count: 0,
      friends_count: 0,
      default_profile: false,
      default_profile_image: false,
    },
    reportUser: {
      id: reportUserId,
      screen_name: `test ${reportUserId}`,
      name: `test ${reportUserId}`,
      description: `test ${reportUserId}`,
      profile_image_url: `test ${reportUserId}`,
      created_at: new Date().toISOString(),
      is_blue_verified: false,
      followers_count: 0,
      friends_count: 0,
      default_profile: false,
      default_profile_image: false,
    },
    context: {
      tweet: {
        id: tweetId,
        text: 'test',
        created_at: new Date().toISOString(),
        conversation_id_str: '1',
        in_reply_to_status_id_str: '2',
        quoted_status_id_str: '3',
      },
      page_url: 'https://x.com/home',
      page_type: 'timeline',
    },
  }
}

async function add(spamUserId: string, reportUserId: string, tweetId: string) {
  const spamReport = getSpamRequest(spamUserId, reportUserId, tweetId)
  return await fetch('/api/twitter/spam-users', {
    method: 'POST',
    body: JSON.stringify(spamReport),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

async function getSpamUsers(): Promise<Record<string, number>> {
  const users = await c.db
    .select()
    .from(user)
    .where(gt(user.spamReportCount, 0))
  return users.reduce((acc, user) => {
    acc[user.id] = user.spamReportCount
    return acc
  }, {} as Record<string, number>)
}

describe('report spam', () => {
  it('should be able to report spam', async () => {
    expect((await add('1', '2', '1')).ok).true
    expect((await add('1', '2', '2')).ok).true
    expect((await add('1', '3', '1')).ok).true
    expect((await add('2', '3', '1')).ok).true
    const users = await getSpamUsers()
    expect(users).toEqual({ '1': 2, '2': 1 })
  })

  it('should be duplicate spam report', async () => {
    expect((await add('1', '2', '1')).ok).true
    expect((await add('1', '2', '1')).ok).true
    expect((await add('1', '2', '1')).ok).true
    const users = await getSpamUsers()
    expect(users).toEqual({ '1': 1 })
  })
  it('should be able to report spam with update new fields', async () => {
    expect((await add('1', '2', '1')).ok).true
    const tweets = await c.db.select().from(tweet).all()
    expect(tweets).length(1)
    expect(tweets[0].conversationId).toEqual('1')
    let user1 = await c.db.select().from(user).where(eq(user.id, '1')).get()
    assert(user1)
    expect(user1.blueVerified).eq(false)
    expect(user1.followersCount).eq(0)
    expect(user1.followingCount).eq(0)

    const spamReport = getSpamRequest('1', '2', '1')
    spamReport.spamUser.is_blue_verified = true
    spamReport.spamUser.followers_count = 100
    spamReport.spamUser.friends_count = 100
    const r2 = await fetch('/api/twitter/spam-users', {
      method: 'POST',
      body: JSON.stringify(spamReport),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(r2.ok).true
    user1 = await c.db.select().from(user).where(eq(user.id, '1')).get()
    assert(user1)
    expect(user1.blueVerified).eq(true)
    expect(user1.followersCount).eq(100)
    expect(user1.followingCount).eq(100)
  })
  it('should be able to report spam with relation tweets', async () => {
    /*
      twitter thread
      timeline tweet:
        tweet-1
      reply tweet:
        tweet-2
          sub reply tweet:
            tweet-4
              quote tweet:
                tweet-3
      report user:
        user-5
    */
    const spamReport: TwitterSpamReportRequest = {
      spamUser: {
        id: '10000004',
        screen_name: 'user-4',
        name: 'user-4',
      },
      reportUser: {
        id: '10000005',
        screen_name: 'user-5',
        name: 'user-5',
      },
      context: {
        tweet: {
          id: '20000004',
          text: 'tweet-4',
          created_at: new Date().toISOString(),
          conversation_id_str: '20000001',
          in_reply_to_status_id_str: '20000002',
          quoted_status_id_str: '20000003',
        },
        page_url: 'https://x.com/home',
        page_type: 'timeline',
        relationTweets: [
          {
            tweet: {
              id: '20000001',
              text: 'tweet-1',
              created_at: new Date().toISOString(),
            },
            user: {
              id: '10000001',
              screen_name: 'user-1',
              name: 'user-1',
            },
          },
          {
            tweet: {
              id: '20000002',
              text: 'tweet-2',
              created_at: new Date().toISOString(),
            },
            user: {
              id: '10000002',
              screen_name: 'user-2',
              name: 'user-2',
            },
          },
          {
            tweet: {
              id: '20000003',
              text: 'tweet-3',
              created_at: new Date().toISOString(),
            },
            user: {
              id: '10000003',
              screen_name: 'user-3',
              name: 'user-3',
            },
          },
        ],
      },
    }
    const resp = await fetch('/api/twitter/spam-users', {
      method: 'POST',
      body: JSON.stringify(spamReport),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(resp.ok).true
    const users = await c.db.select().from(user).all()
    expect(users).length(5)
    const user4 = users.find((it) => it.id === '10000004')
    assert(user4)
    expect(user4.spamReportCount).eq(1)
    const tweets = await c.db.select().from(tweet).all()
    expect(tweets).length(4)
    const tweet4 = tweets.find((it) => it.id === '20000004')
    assert(tweet4)
    expect(tweet4.conversationId).eq('20000001')
    expect(tweet4.inReplyToStatusId).eq('20000002')
    expect(tweet4.quotedStatusId).eq('20000003')
    expect(tweet4.spamReportCount).eq(1)
  })
  it('should be able to report spam with location and url', async () => {
    const spamReport = getSpamRequest('1', '2', '1')
    spamReport.spamUser.location = 'test'
    spamReport.spamUser.url = 'test'
    await fetch('/api/twitter/spam-users', {
      method: 'POST',
      body: JSON.stringify(spamReport),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const r = (await c.db.select().from(user).get({
      id: '1',
    }))!
    expect(r.location).eq('test')
    expect(r.url).eq('test')
  })
})

describe('get spam users for type', () => {
  const getSpamUsers = async (force?: boolean) => {
    const params = new URLSearchParams()
    if (force) {
      params.set('force', 'true')
    }
    const r = await fetch(
      `/api/twitter/spam-users-for-type?${params.toString()}`,
    )
    expect(r.ok).true
    return (await r.json()) as Record<string, 'spam' | 'report'>
  }
  it('should be get spam users for type', async () => {
    expect((await add('2', '1', '2')).ok).true
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
    expect((await add('4', '1', '4')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
  it('should be get spam users for type with force', async () => {
    expect((await add('2', '1', '2')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers(true)).toEqual({ '2': 'report', '3': 'report' })
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
  it('should be get spam users for type with expired cache', async () => {
    vi.useFakeTimers()
    expect((await add('2', '1', '2')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    vi.setSystemTime(Date.now() + 1000 * 60 * 60 * 24 + 1)
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
    vi.useRealTimers()
  })
})

describe('check spam user', () => {
  async function checkSpamUser(request: CheckSpamUserRequest) {
    const resp = await fetch('/api/twitter/spam-users/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    expect(resp.ok).true
    return (await resp.json()) as CheckSpamUserResponse
  }
  function genCheckSpamUserRequest(
    users: { id: string; tweetIds: string[] }[],
  ): CheckSpamUserRequest {
    return users.map((it) => ({
      user: {
        id: it.id,
        screen_name: `test ${it.id}`,
        name: `test ${it.id}`,
      },
      tweets: it.tweetIds.map((tweetId) => ({
        id: tweetId,
        created_at: new Date().toISOString(),
        text: 'test',
        user_id: it.id,
        conversation_id_str: tweetId,
      })),
    }))
  }
  it('should be able to check spam user', async () => {
    const r1 = await checkSpamUser(
      genCheckSpamUserRequest([
        { id: '10000001', tweetIds: ['20000001', '20000002'] },
        { id: '10000002', tweetIds: ['20000003', '20000004'] },
      ]),
    )
    expect(r1).length(0)
    expect(await c.db.$count(user)).eq(2)
    expect(await c.db.$count(tweet)).eq(4)
    await c.db.insert(userSpamAnalysis).values([
      {
        userId: '10000001',
        llmSpamRating: 5,
        llmSpamExplanation: 'test',
        isSpamByManualReview: true,
        manualReviewedAt: new Date().toISOString(),
      },
      {
        userId: '10000002',
        llmSpamRating: 1,
        llmSpamExplanation: '',
        isSpamByManualReview: false,
        manualReviewedAt: new Date().toISOString(),
      },
    ])
    const r2 = await checkSpamUser(
      genCheckSpamUserRequest([
        { id: '10000001', tweetIds: ['20000001', '20000002'] },
        { id: '10000002', tweetIds: ['20000003', '20000004'] },
        { id: '10000003', tweetIds: ['20000005', '20000006'] },
      ]),
    )
    expect(r2).length(1)
    expect(r2[0].userId).eq('10000001')
    expect(r2[0].isSpamByManualReview).eq(true)
  })
  it('should be able to disallow check spam user with big batch', async () => {
    await expect(
      checkSpamUser(
        genCheckSpamUserRequest(
          range(1000).map((it) => ({
            id: `user-${it}`,
            tweetIds: range(10).map((it) => `tweet-${it}`),
          })),
        ),
      ),
    ).rejects.toThrowError()
  })
  it('should be able to disallow duplicate tweet', async () => {
    const user: CheckSpamUserRequest[number]['user'] = {
      id: '10000001',
      screen_name: 'user-1',
      name: 'user-1',
    }
    const tweets: CheckSpamUserRequest[number]['tweets'] = [
      {
        id: '20000001',
        created_at: new Date().toISOString(),
        text: 'test A',
        user_id: '10000001',
        conversation_id_str: 'tweet-1',
      },
    ]
    await checkSpamUser([{ user, tweets }])
    const r1 = await c.db.select().from(tweet).all()
    expect(r1[0].text).eq('test A')
    tweets[0].text = 'test B'
    await checkSpamUser([{ user, tweets }])
    const r2 = await c.db.select().from(tweet).all()
    expect(r2[0].text).eq('test A')
  })
  it('should be able to allow duplicate tweet with not complete', async () => {
    const request: CheckSpamUserRequest = [
      {
        user: {
          id: '10000001',
          screen_name: 'user-1',
          name: 'user-1',
        },
        tweets: [
          {
            id: '20000001',
            created_at: new Date().toISOString(),
            text: 'test B',
            user_id: '10000001',
            conversation_id_str: 'tweet-1',
          },
        ],
      },
    ]

    await c.db.insert(user).values({
      id: '10000001',
      screenName: 'user-1',
      name: 'user-1',
    })
    await c.db.insert(tweet).values({
      id: '20000001',
      text: 'test A',
      userId: '10000001',
      publishedAt: new Date().toISOString(),
      conversationId: '20000001',
    })
    await checkSpamUser(request)
    const r1 = await c.db.select().from(tweet).all()
    expect(r1[0].text).eq('test A')
    await c.db
      .update(tweet)
      .set({
        conversationId: null,
      })
      .where(eq(tweet.id, '20000001'))
    await checkSpamUser(request)
    const r2 = await c.db.select().from(tweet).all()
    expect(r2[0].text).eq('test B')
  })
  it('should be able to prevent duplicate update user and tweet', async () => {
    await c.db.insert(user).values({
      id: '10000001',
      screenName: 'user-1',
      name: 'user-1',
    })
    const request: CheckSpamUserRequest = [
      {
        user: { id: '10000001', screen_name: 'user-1', name: 'user-1' },
        tweets: [],
      },
    ]
    await checkSpamUser(request)
    const r1 = await c.db.select().from(user).all()
    expect(r1[0].screenName).eq('user-1')
    request[0].user.name = 'user-2'
    await checkSpamUser(request)
    const r2 = await c.db.select().from(user).all()
    expect(r2[0].name).eq('user-1')
    request[0].user.followers_count = 100
    request[0].user.friends_count = 100
    await checkSpamUser(request)
    const r3 = await c.db.select().from(user).all()
    expect(r3[0].name).eq('user-2')
    expect(r3[0].followersCount).eq(100)
    expect(r3[0].followingCount).eq(100)
    request[0].user.name = 'user-3'
    await checkSpamUser(request)
    const r4 = await c.db.select().from(user).all()
    expect(r4[0].name).eq('user-2')
  })
  it('fix: D1_ERROR: too many SQL variables at offset 633: SQLITE_ERROR', async () => {
    await checkSpamUser(
      range(10).map((it) => {
        const userId = `1000000${it}`
        return {
          user: {
            id: userId,
            screen_name: `user-${it}`,
            name: `user-${it}`,
          },
          tweets: range(20).map((it) => ({
            id: `2000000${it}`,
            created_at: new Date().toISOString(),
            text: `test ${it}`,
            user_id: userId,
          })),
        }
      }),
    )
  })
  it('fix: D1_ERROR: too many SQL variables at offset 633: SQLITE_ERROR(real json)', async () => {
    const data = (await import('./assets/check.json'))
      .default as CheckSpamUserRequest
    await checkSpamUser(data)
  })
  it('D1_ERROR: UNIQUE constraint failed: User.id: SQLITE_CONSTRAINT', async () => {
    const data = genCheckSpamUserRequest([
      { id: '10000001', tweetIds: ['20000001', '20000002'] },
      { id: '10000002', tweetIds: ['20000003', '20000004'] },
    ])
    await Promise.all([checkSpamUser(data), checkSpamUser(data)])
  })
})

describe('batch upsert users', () => {
  it('should be able to upsert users', async () => {
    const r1 = await upsertUsers(c.db, [
      { id: '10000001', screenName: 'user-1', name: 'user-1' },
    ])
    expect(r1).length(1)
    await c.db.batch(r1 as any)
    const r2 = await upsertUsers(c.db, [
      { id: '10000001', screenName: 'user-1', name: 'user-1' },
    ])
    expect(r2).length(0)
  })
})

describe('batch upsert tweets', () => {
  it('should be able to upsert tweets', async () => {
    await c.db.insert(user).values({
      id: '10000001',
      screenName: 'user-1',
      name: 'user-1',
    })
    const r1 = await upsertTweets(c.db, [
      {
        id: '20000001',
        text: 'test',
        userId: '10000001',
        publishedAt: new Date().toISOString(),
      },
    ])
    expect(r1).length(1)
    await c.db.batch(r1 as any)
    const r2 = await upsertTweets(c.db, [
      {
        id: '20000001',
        text: 'test',
        userId: '10000001',
        publishedAt: new Date().toISOString(),
      },
    ])
    expect(r2).length(0)
  })
})
