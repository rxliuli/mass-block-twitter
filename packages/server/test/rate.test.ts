import { describe, it, expect } from 'vitest'
import { TwitterSpamReportRequest } from '../src/lib'
import { initCloudflareTest } from './utils'

initCloudflareTest()

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

describe('report spam', () => {
  // TODO: disable rate limit, wait https://github.com/rhinobase/hono-rate-limiter/issues/34
  it.skip('should be rate limit', async () => {
    for (let i = 0; i < 100; i++) {
      expect((await add('1', '2', '1')).ok).true
    }
    expect((await add('1', '2', '1')).status).eq(429)
  })
})
