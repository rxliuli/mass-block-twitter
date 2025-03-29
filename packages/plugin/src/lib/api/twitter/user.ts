import {
  ExpectedError,
  getRequestHeaders,
  getXTransactionId,
  parseUserRecords,
} from '$lib/api'
import { User } from '$lib/db'
import { extractObjects } from '$lib/util/extractObjects'
import { z } from 'zod'
import { extractGQLArgsByName } from './utils'

export function parseTimelineUserNextCursor(json: any) {
  const schema = z.object({
    entryType: z.literal('TimelineTimelineCursor'),
    value: z.string(),
    cursorType: z.literal('Bottom'),
  })
  const cursor = (
    extractObjects(json, (it) => schema.safeParse(it).success) as z.infer<
      typeof schema
    >[]
  )[0]?.value
  return cursor
}

export function parseBlockedUsers(json: any): {
  data: User[]
  cursor?: string
} {
  return {
    data: parseUserRecords(json),
    cursor: parseTimelineUserNextCursor(json),
  }
}

export async function getBlockedUsers(options: {
  count: number
  cursor?: string
}) {
  const args = await extractGQLArgsByName('BlockedAccountsAll')
  if (!args) {
    throw new Error('Failed to extract get blocked users graphql id')
  }
  const url = new URL(
    `https://x.com/i/api/graphql/${args.queryId}/BlockedAccountsAll`,
  )
  url.searchParams.set(
    'variables',
    JSON.stringify({
      count: options.count,
      cursor: options.cursor,
      includePromotedContent: false,
    }),
  )
  url.searchParams.set('features', JSON.stringify(args.flags))
  const headers = getRequestHeaders()
  const xTransactionId = await getXTransactionId()(url.pathname, 'GET')
  const r = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'es,zh-CN;q=0.9,zh;q=0.8,en;q=0.7',
      authorization: headers.get('authorization')!,
      'content-type': 'application/json',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-client-transaction-id': xTransactionId,
      'x-client-uuid': headers.get('x-client-uuid')!,
      'x-csrf-token': headers.get('x-csrf-token')!,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    },
    referrer: 'https://x.com/settings/blocked/all',
    body: null,
    method: 'GET',
  })
  if (!r.ok) {
    throw r
  }
  const json = await r.json()
  return parseBlockedUsers(json)
}

export async function blockUser(user: Pick<User, 'id'>) {
  if (!user.id) {
    throw new Error('userId is required')
  }
  const headers = getRequestHeaders()
  const xTransactionId = await getXTransactionId()(
    '/i/api/1.1/blocks/create.json',
    'POST',
  )
  const r = await fetch('https://x.com/i/api/1.1/blocks/create.json', {
    headers: new Headers({
      accept: '*/*',
      'accept-language':
        'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
      authorization: headers.get('authorization')!,
      'content-type': 'application/x-www-form-urlencoded',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-client-transaction-id': xTransactionId,
      'x-client-uuid': headers.get('x-client-uuid')!,
      'x-csrf-token': headers.get('x-csrf-token')!,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    }),
    referrer: location.href,
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: 'user_id=' + user.id,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })
  if (!r.ok) {
    if (r.status === 429) {
      throw new ExpectedError('rateLimit', 'Rate limit exceeded')
    }
    if (r.status === 404) {
      throw new ExpectedError('notFound', 'User not found')
    }
    if (r.status === 401) {
      throw new ExpectedError('unauthorized', 'Unauthorized')
    }
    if (r.status === 403) {
      throw new ExpectedError('forbidden', 'Forbidden')
    }
    throw new Error(r.statusText)
  }
}

export async function unblockUser(userId: string) {
  if (!userId) {
    throw new Error('userId is required')
  }
  const headers = getRequestHeaders()
  const xTransactionId = await getXTransactionId()(
    '/i/api/1.1/blocks/destroy.json',
    'POST',
  )
  const r = await fetch('https://x.com/i/api/1.1/blocks/destroy.json', {
    headers: new Headers({
      authorization: headers.get('authorization')!,
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua':
        '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'x-client-transaction-id': xTransactionId,
      'x-client-uuid': headers.get('x-client-uuid')!,
      'x-csrf-token': headers.get('x-csrf-token')!,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    }),
    referrer: 'https://x.com/cryptocishanjia',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: 'user_id=' + userId,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })
  if (!r.ok) {
    throw new Error(r.statusText)
  }
}
