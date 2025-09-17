import {
  getRequestHeaders,
  timelineUserSchema,
  xClientTransaction,
} from '$lib/api'
import { User } from '$lib/db'
import { extractObjects } from '$lib/util/extractObjects'
import { once } from '@liuli-util/async'
import { get } from 'es-toolkit/compat'
import { z } from 'zod'
import { extractAllFlags, fetchAsset } from './utils'

export type CommunityMember = User & {
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
        screen_name: (it.core?.screen_name ?? it.legacy.screen_name)!,
        name: (it.core?.name ?? it.legacy.name)!,
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

export function extractParamsData(scriptContent: string) {
  // params:{id:"V7OdnMvujMPsCctT_daznQ",metadata:{features:["responsive_web_graphql_timeline_navigation_enabled"],sliceInfoPath:["communityResults","result","members_slice","slice_info"]},name:"membersSliceTimeline_Query"
  //params:{id:"D5_l6jsKx4k9hr5T8mn-vQ",metadata:{features:["responsive_web_graphql_timeline_navigation_enabled"],sliceInfoPath:["communityResults","result","members_slice","slice_info"]},name:"membersSliceTimeline_Query",operationKind:"query",text:null}};
  const paramsRegex = /params:{id:"([\w\W_]+?)",[\s\S]*?name:"([^"]+)"/
  const match = scriptContent.match(paramsRegex)
  if (!match) {
    return
  }
  return {
    id: match[1],
    name: match[2],
  }
}

function extractCommunityGQLArgs(scriptContent: string) {
  // params:{id:"V7OdnMvujMPsCctT_daznQ",metadata:{features:["responsive_web_graphql_timeline_navigation_enabled"],sliceInfoPath:["communityResults","result","members_slice","slice_info"]},name:"membersSliceTimeline_Query"
  //params:{id:"D5_l6jsKx4k9hr5T8mn-vQ",metadata:{features:["responsive_web_graphql_timeline_navigation_enabled"],sliceInfoPath:["communityResults","result","members_slice","slice_info"]},name:"membersSliceTimeline_Query",operationKind:"query",text:null}};
  const matches = [
    ...scriptContent.matchAll(
      /params:\{id:"([^"]+)",metadata:(\{.*?\}),name:"([^"]+)"/g,
    ),
  ]
  return matches.map((it) => {
    const queryId = it[1]
    const metadataStr = it[2]
    const featuresMatch = metadataStr.match(/features:(\[[^\]]*\])/)
    const features = (
      featuresMatch ? JSON.parse(featuresMatch[1]) : []
    ) as string[]
    const operationName = it[3]
    return {
      operationName,
      queryId,
      features,
    }
  })
}

export async function extractCommunityGraphqlId(name: string): Promise<
  | {
      operationName: string
      queryId: string
      features: Record<string, any>
    }
  | undefined
> {
  const swStr = await fetchAsset('https://x.com/sw.js')
  const allFlags = await extractAllFlags()
  const jsRegex = new RegExp(
    '"(https://abs.twimg.com/responsive-web/client-web/bundle\\..+?.js)"',
    'g',
  )
  const scriptUrls: string[] = []
  swStr.matchAll(jsRegex).forEach((it) => {
    scriptUrls.push(it[1])
  })
  for (const url of scriptUrls) {
    const scriptStr = await fetchAsset(url)
    const args = extractCommunityGQLArgs(scriptStr)
    const r = args.find((it) => it.operationName === name)
    if (r?.queryId) {
      const features = r.features.reduce((acc, feature) => {
        acc[feature] = allFlags[feature] ?? false
        return acc
      }, {} as Record<string, any>)
      return {
        operationName: r.operationName,
        queryId: r.queryId,
        features,
      }
    }
  }
}

export async function getCommunityMembers(options: {
  communityId: string
  cursor?: string
}): Promise<{
  data: CommunityMember[]
  cursor: string
}> {
  const arg = await extractCommunityGraphqlId('membersSliceTimeline_Query')
  if (!arg) {
    throw new Error('queryId not found')
  }
  const url = new URL(
    `https://x.com/i/api/graphql/${arg.queryId}/membersSliceTimeline_Query`,
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
  const xTransactionId = await xClientTransaction.generateTransactionId(
    'GET',
    url.pathname,
  )
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
  const arg = await extractCommunityGraphqlId('CommunityQuery')
  if (!arg) {
    throw new Error('queryId not found')
  }
  const url = new URL(`https://x.com/i/api/graphql/${arg.queryId}/CommunityQuery`)
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
  const xTransactionId = await xClientTransaction.generateTransactionId(
    'GET',
    url.toString(),
  )
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
