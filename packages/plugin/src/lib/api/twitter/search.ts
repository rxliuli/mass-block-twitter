import {
  getRequestHeaders,
  getXTransactionId,
  parseUserRecords,
} from '$lib/api'
import { User } from '$lib/db'
import { extractCurrentUserId } from '$lib/observe'
import { z } from 'zod'
import { extractGQLArgsByName } from './utils'
import { extractObjects } from '$lib/util/extractObjects'
import { parseTimelineUserNextCursor } from './user'

// https://x.com/i/api/1.1/strato/column/User/<userId>/search/searchSafetyReadonly
export async function getSearchSafety(): Promise<{
  optInBlocking: boolean
  optInFiltering: boolean
}> {
  const userId = extractCurrentUserId()
  if (!userId) {
    throw new Error('User ID not found')
  }
  const url = new URL(
    `https://x.com/i/api/1.1/strato/column/User/${userId}/search/searchSafetyReadonly`,
  )
  const resp = await fetch(url, {
    headers: getRequestHeaders(),
  })
  if (!resp.ok) {
    throw resp
  }
  const data = await resp.json()
  return data
}

export async function setSearchSafety(options: {
  optInBlocking: boolean
  optInFiltering: boolean
}) {
  const userId = extractCurrentUserId()
  if (!userId) {
    throw new Error('User ID not found')
  }
  const url = new URL(
    `https://x.com/i/api/1.1/strato/column/User/${userId}/search/searchSafety`,
  )
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...getRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
  if (!resp.ok) {
    throw resp
  }
}

export function parseSearchPeople(json: any): {
  data: User[]
  cursor: string
} {
  return {
    data: parseUserRecords(json),
    cursor: parseTimelineUserNextCursor(json),
  }
}

export async function searchPeople(options: {
  term: string
  count?: number
  cursor?: string
}) {
  const args = await extractGQLArgsByName('SearchTimeline')
  if (!args) {
    throw new Error('SearchTimeline queryId not found')
  }
  const url = new URL(
    `https://x.com/i/api/graphql/${args.queryId}/SearchTimeline`,
  )
  url.searchParams.set(
    'variables',
    JSON.stringify({
      rawQuery: options.term,
      count: options.count,
      querySource: 'typed_query',
      product: 'People',
      cursor: options.cursor,
    }),
  )
  url.searchParams.set('features', JSON.stringify(args.flags))

  const headers = getRequestHeaders()
  const xTransactionId = await getXTransactionId()(url.pathname, 'GET')
  const r = await fetch(url, {
    headers: {
      authorization: headers.get('authorization')!,
      'content-type': 'application/json',
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
    },
    referrer:
      'https://x.com/search?' +
      new URLSearchParams({
        // q=%E7%90%89%E7%92%83&src=typed_query
        q: options.term,
        src: 'typed_query',
        f: 'user',
      }).toString(),
  })
  if (!r.ok) {
    throw r
  }
  const json = await r.json()
  return parseSearchPeople(json)
}
