import {
  ExpectedError,
  getRequestHeaders,
  getXTransactionId,
  parseUserRecords,
  xClientTransaction,
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
  const data = parseUserRecords(json)
  if (data.length === 0) {
    return {
      data,
      cursor: undefined,
    }
  }
  return {
    data,
    cursor: parseTimelineUserNextCursor(json),
  }
}

export async function getBlockedUsers(options: {
  count: number
  cursor?: string
}) {
  const json = await graphqlQuery({
    operationName: 'BlockedAccountsAll',
    variables: {
      count: options.count,
      cursor: options.cursor,
      includePromotedContent: false,
    },
    referer: 'https://x.com/settings/blocked/all',
  })
  return parseBlockedUsers(json)
}

export async function blockUser(user: Pick<User, 'id'>) {
  if (!user.id) {
    throw new Error('userId is required')
  }
  const headers = getRequestHeaders()
  const xTransactionId = await xClientTransaction.generateTransactionId(
    'POST',
    '/i/api/1.1/blocks/create.json',
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
  const xTransactionId = await xClientTransaction.generateTransactionId(
    'POST',
    '/i/api/1.1/blocks/destroy.json',
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

export async function getUserByScreenName(
  screenName: string,
): Promise<User | undefined> {
  const json = await graphqlQuery({
    operationName: 'UserByScreenName',
    variables: {
      screen_name: screenName,
    },
  })
  return parseUserRecords(json)[0]
}

export async function graphqlQuery(options: {
  operationName: Parameters<typeof extractGQLArgsByName>[0]
  variables: Record<string, any>
  referer?: string
}) {
  const args = await extractGQLArgsByName(options.operationName)
  if (!args) {
    throw new Error('Failed to extract get blocked users graphql id')
  }
  const url = new URL(
    `https://x.com/i/api/graphql/${args.queryId}/${options.operationName}`,
  )
  url.searchParams.set('variables', JSON.stringify(options.variables))
  url.searchParams.set('features', JSON.stringify(args.flags))
  url.searchParams.set('features', JSON.stringify(args.flags))
  const headers = getRequestHeaders()
  const xTransactionId = await xClientTransaction.generateTransactionId(
    'GET',
    url.pathname,
  )
  const resp = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
      ...headers,
      authorization: headers.get('authorization')!,
      'x-client-transaction-id': xTransactionId,
      'x-client-uuid': headers.get('x-client-uuid')!,
      'x-csrf-token': headers.get('x-csrf-token')!,
    },
    referrer: options.referer ?? location.href,
  })
  if (!resp.ok) {
    throw resp
  }
  return await resp.json()
}

export async function getUserFollowers(options: {
  userId: string
  cursor?: string
  count?: number
}): Promise<{
  data: User[]
  cursor?: string
}> {
  const json = await graphqlQuery({
    operationName: 'Followers',
    variables: {
      userId: options.userId,
      count: options.count ?? 20,
      cursor: options.cursor,
      includePromotedContent: false,
    },
  })
  return parseBlockedUsers(json)
}

export async function getUserFollowing(options: {
  userId: string
  cursor?: string
  count?: number
}) {
  const json = await graphqlQuery({
    operationName: 'Following',
    variables: {
      userId: options.userId,
      count: options.count ?? 20,
      cursor: options.cursor,
      includePromotedContent: false,
    },
  })
  return parseBlockedUsers(json)
}

export async function getUserBlueVerifiedFollowers(options: {
  userId: string
  cursor?: string
  count?: number
}) {
  const json = await graphqlQuery({
    operationName: 'BlueVerifiedFollowers',
    variables: {
      userId: options.userId,
      count: options.count ?? 20,
      cursor: options.cursor,
      includePromotedContent: false,
    },
  })
  return parseBlockedUsers(json)
}
