import { assert, describe, expect, it, vi } from 'vitest'
import type {
  CheckSpamUserRequest,
  CheckSpamUserResponse,
  TwitterSpamReportRequest,
} from '../src/lib'
import { initCloudflareTest } from './utils'
import { tweet, user, userSpamAnalysis } from '../src/db/schema'

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
  const users = await c.prisma.user.findMany({
    where: { spamReportCount: { gt: 0 } },
  })
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
    const tweets = await c.prisma.tweet.findMany()
    expect(tweets).length(1)
    expect(tweets[0].conversationId).toEqual('1')
    let user1 = await c.prisma.user.findUnique({ where: { id: '1' } })
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
    user1 = await c.prisma.user.findUnique({ where: { id: '1' } })
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
    const users = await c.prisma.user.findMany()
    expect(users).length(5)
    const user4 = users.find((it) => it.id === 'user-4')
    assert(user4)
    expect(user4.spamReportCount).eq(1)
    const tweets = await c.prisma.tweet.findMany()
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
  async function checkSpamUser(users: { id: string; tweetIds: string[] }[]) {
    const resp = await fetch('/api/twitter/spam-users/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        users.map((it) => ({
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
          })),
        })) satisfies CheckSpamUserRequest,
      ),
    })
    expect(resp.ok).true
    return (await resp.json()) as CheckSpamUserResponse
  }
  it('should be able to check spam user', async () => {
    const r1 = await checkSpamUser([
      { id: 'user-1', tweetIds: ['tweet-1', 'tweet-2'] },
      { id: 'user-2', tweetIds: ['tweet-3', 'tweet-4'] },
    ])
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
    const r2 = await checkSpamUser([
      { id: 'user-1', tweetIds: ['tweet-1', 'tweet-2'] },
      { id: 'user-2', tweetIds: ['tweet-3', 'tweet-4'] },
      { id: 'user-3', tweetIds: ['tweet-5', 'tweet-6'] },
    ])
    expect(r2).length(1)
    expect(r2[0].userId).eq('user-1')
    expect(r2[0].isSpamByManualReview).eq(true)
  })
})
