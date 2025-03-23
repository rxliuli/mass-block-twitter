import { assert, describe, expect, it, vi } from 'vitest'
import type {
  CheckSpamUserRequest,
  CheckSpamUserResponse,
  TwitterSpamReportRequest,
} from '../src/lib'
import { initCloudflareTest } from './utils'
import { tweet, user, userSpamAnalysis } from '../src/db/schema'
import { eq, gt, sql } from 'drizzle-orm'
import { range } from 'es-toolkit'
import { drizzle } from 'drizzle-orm/d1'

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
        id: 'user-4',
        screen_name: 'user-4',
        name: 'user-4',
      },
      reportUser: {
        id: 'user-5',
        screen_name: 'user-5',
        name: 'user-5',
      },
      context: {
        tweet: {
          id: 'tweet-4',
          text: 'tweet-4',
          created_at: new Date().toISOString(),
          conversation_id_str: 'tweet-1',
          in_reply_to_status_id_str: 'tweet-2',
          quoted_status_id_str: 'tweet-3',
        },
        page_url: 'https://x.com/home',
        page_type: 'timeline',
        relationTweets: [
          {
            tweet: {
              id: 'tweet-1',
              text: 'tweet-1',
              created_at: new Date().toISOString(),
            },
            user: {
              id: 'user-1',
              screen_name: 'user-1',
              name: 'user-1',
            },
          },
          {
            tweet: {
              id: 'tweet-2',
              text: 'tweet-2',
              created_at: new Date().toISOString(),
            },
            user: {
              id: 'user-2',
              screen_name: 'user-2',
              name: 'user-2',
            },
          },
          {
            tweet: {
              id: 'tweet-3',
              text: 'tweet-3',
              created_at: new Date().toISOString(),
            },
            user: {
              id: 'user-3',
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
    const user4 = users.find((it) => it.id === 'user-4')
    assert(user4)
    expect(user4.spamReportCount).eq(1)
    const tweets = await c.db.select().from(tweet).all()
    expect(tweets).length(4)
    const tweet4 = tweets.find((it) => it.id === 'tweet-4')
    assert(tweet4)
    expect(tweet4.conversationId).eq('tweet-1')
    expect(tweet4.inReplyToStatusId).eq('tweet-2')
    expect(tweet4.quotedStatusId).eq('tweet-3')
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
        { id: 'user-1', tweetIds: ['tweet-1', 'tweet-2'] },
        { id: 'user-2', tweetIds: ['tweet-3', 'tweet-4'] },
      ]),
    )
    expect(r1).length(0)
    expect(await c.db.$count(user)).eq(2)
    expect(await c.db.$count(tweet)).eq(4)
    await c.db.insert(userSpamAnalysis).values([
      {
        userId: 'user-1',
        llmSpamRating: 5,
        llmSpamExplanation: 'test',
        isSpamByManualReview: true,
        manualReviewedAt: new Date().toISOString(),
      },
      {
        userId: 'user-2',
        llmSpamRating: 1,
        llmSpamExplanation: '',
        isSpamByManualReview: false,
        manualReviewedAt: new Date().toISOString(),
      },
    ])
    const r2 = await checkSpamUser(
      genCheckSpamUserRequest([
        { id: 'user-1', tweetIds: ['tweet-1', 'tweet-2'] },
        { id: 'user-2', tweetIds: ['tweet-3', 'tweet-4'] },
        { id: 'user-3', tweetIds: ['tweet-5', 'tweet-6'] },
      ]),
    )
    expect(r2).length(1)
    expect(r2[0].userId).eq('user-1')
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
      id: 'user-1',
      screen_name: 'user-1',
      name: 'user-1',
    }
    const tweets: CheckSpamUserRequest[number]['tweets'] = [
      {
        id: 'tweet-1',
        created_at: new Date().toISOString(),
        text: 'test A',
        user_id: 'user-1',
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
          id: 'user-1',
          screen_name: 'user-1',
          name: 'user-1',
        },
        tweets: [
          {
            id: 'tweet-1',
            created_at: new Date().toISOString(),
            text: 'test B',
            user_id: 'user-1',
            conversation_id_str: 'tweet-1',
          },
        ],
      },
    ]

    await c.db.insert(user).values({
      id: 'user-1',
      screenName: 'user-1',
      name: 'user-1',
    })
    await c.db.insert(tweet).values({
      id: 'tweet-1',
      text: 'test A',
      userId: 'user-1',
      publishedAt: new Date().toString(),
      conversationId: 'tweet-1',
    })
    await checkSpamUser(request)
    const r1 = await c.db.select().from(tweet).all()
    expect(r1[0].text).eq('test A')
    await c.db
      .update(tweet)
      .set({
        conversationId: null,
      })
      .where(eq(tweet.id, 'tweet-1'))
    await checkSpamUser(request)
    const r2 = await c.db.select().from(tweet).all()
    expect(r2[0].text).eq('test B')
  })
  it('should be able to prevent duplicate update user and tweet', async () => {
    await c.db.insert(user).values({
      id: 'user-1',
      screenName: 'user-1',
      name: 'user-1',
    })
    const request: CheckSpamUserRequest = [
      {
        user: { id: 'user-1', screen_name: 'user-1', name: 'user-1' },
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
        const userId = `user-${it}`
        return {
          user: {
            id: userId,
            screen_name: `user-${it}`,
            name: `user-${it}`,
          },
          tweets: range(20).map((it) => ({
            id: `tweet-${userId}-${it}`,
            created_at: new Date().toISOString(),
            text: `test ${it}`,
            user_id: userId,
          })),
        }
      }),
    )
  })
})
