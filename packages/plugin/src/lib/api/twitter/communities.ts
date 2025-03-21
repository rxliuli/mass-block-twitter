import {
  getRequestHeaders,
  getXTransactionId,
  parseTimelineUser,
  timelineUserSchema,
} from '$lib/api'
import { User } from '$lib/db'
import { extractObjects } from '$lib/util/extractObjects'
import { get } from 'lodash-es'
import { z } from 'zod'

type CommunityMember = User & {
  community_role: 'Member' | 'Moderator' | 'Admin'
}

const communityMemberSchema = timelineUserSchema.extend({
  community_role: z.enum(['Member', 'Moderator', 'Admin']),
  legacy: timelineUserSchema.shape.legacy.pick({
    screen_name: true,
    name: true,
    profile_image_url_https: true,
    blocking: true,
    following: true,
  }),
})
export function parseCommunityMembers(json: any): {
  data: CommunityMember[]
  cursor: string
} {
  const data = (
    extractObjects(
      json,
      (obj) => communityMemberSchema.safeParse(obj).success,
    ) as z.infer<typeof communityMemberSchema>[]
  ).map(
    (it) =>
      ({
        id: it.rest_id,
        screen_name: it.legacy.screen_name,
        name: it.legacy.name,
        profile_image_url: it.legacy.profile_image_url_https ?? undefined,
        updated_at: new Date().toISOString(),
        blocking: it.legacy.blocking ?? false,
        following: it.legacy.following ?? false,
        community_role: it.community_role,
      } satisfies CommunityMember),
  )
  const cursor = get(
    json,
    'data.communityResults.result.members_slice.slice_info.next_cursor',
  )
  return {
    data,
    cursor,
  }
}

export async function getCommunityMembers(options: {
  communityId: string
  cursor?: string
}): Promise<{
  data: CommunityMember[]
  cursor: string
}> {
  const url = new URL(
    `https://x.com/i/api/graphql/V7OdnMvujMPsCctT_daznQ/membersSliceTimeline_Query`,
  )
  url.searchParams.set(
    'variables',
    JSON.stringify({
      communityId: options.communityId,
      cursor: options.cursor ?? null,
    }),
  )
  url.searchParams.set(
    'features',
    JSON.stringify({
      responsive_web_graphql_timeline_navigation_enabled: true,
    }),
  )
  const headers = getRequestHeaders()
  const xTransactionId = await getXTransactionId()(url.toString(), 'GET')
  const resp = await fetch(url, {
    headers: {
      accept: '*/*',
      authorization: headers.get('authorization')!,
      'accept-language': 'es,zh-CN;q=0.9,zh;q=0.8,en;q=0.7',
      'content-type': 'application/json',
      'x-client-transaction-id': xTransactionId,
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-csrf-token': headers.get('x-csrf-token')!,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'es',
    },
    referrer: `https://x.com/i/communities/${options.communityId}/members`,
    method: 'GET',
  })
  if (!resp.ok) {
    throw resp
  }
  const json = await resp.json()
  return parseCommunityMembers(json)
}

const communityInfoSchema = z.object({
  __typename: z.literal('Community'),
  rest_id: z.string(),
  name: z.string(),
  description: z.string(),
  member_count: z.number(),
  is_nsfw: z.boolean(),
})
export type CommunityInfo = Omit<
  z.infer<typeof communityInfoSchema>,
  '__typename' | 'rest_id'
> & {
  id: string
}
export function parseCommunityInfo(json: any): CommunityInfo {
  const data = extractObjects(
    json,
    (obj) => communityInfoSchema.safeParse(obj).success,
  )[0] as z.infer<typeof communityInfoSchema>
  return {
    id: data.rest_id,
    name: data.name,
    description: data.description,
    member_count: data.member_count,
    is_nsfw: data.is_nsfw,
  }
}

export async function getCommunityInfo(options: { communityId: string }) {
  const url = new URL(
    `https://x.com/i/api/graphql/YDYGxdoPEu0zNC2eWP_0MQ/CommunityQuery`,
  )
  url.searchParams.set(
    'variables',
    JSON.stringify({ communityId: options.communityId }),
  )
  url.searchParams.set(
    'features',
    JSON.stringify({
      c9s_list_members_action_api_enabled: false,
      c9s_superc9s_indication_enabled: false,
    }),
  )
  const xTransactionId = await getXTransactionId()(url.toString(), 'GET')
  const headers = getRequestHeaders()
  const resp = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'es,zh-CN;q=0.9,zh;q=0.8,en;q=0.7',
      authorization: headers.get('authorization')!,
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-client-transaction-id': xTransactionId,
      'x-csrf-token': headers.get('x-csrf-token')!,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'es',
    },
    referrer: `https://x.com/i/communities/${options.communityId}`,
  })
  if (!resp.ok) {
    throw resp
  }
  const json = await resp.json()
  return parseCommunityInfo(json)
}
