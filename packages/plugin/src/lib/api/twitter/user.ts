import {
  ExpectedError,
  extractSearchTimelineGraphqlId,
  getRequestHeaders,
  getXTransactionId,
  parseUserRecords,
} from '$lib/api'
import { User } from '$lib/db'
import { extractObjects } from '$lib/util/extractObjects'
import { once } from 'es-toolkit'
import { z } from 'zod'

const GET_BLOCKED_USERS_GRAPHQL_FLAGS = {
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: false,
  responsive_web_grok_share_attachment_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

export function parseBlockedUsers(json: any): {
  data: User[]
  cursor?: string
} {
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
  return {
    data: parseUserRecords(json),
    cursor,
  }
}

async function extractGetBlockedUsersGraphqlId(): Promise<string | undefined> {
  const linkEl = document.querySelector(
    'link[href^="https://abs.twimg.com/responsive-web/client-web/main."',
  )
  if (!linkEl || !(linkEl instanceof HTMLLinkElement)) {
    throw new Error(
      'link[href^="https://abs.twimg.com/responsive-web/client-web/main."] is required',
    )
  }
  const regex = /queryId:\s*"([^"]+)"[^}]*operationName:\s*"BlockedAccountsAll"/
  const text = await (await fetch(linkEl.href)).text()
  const match = text.match(regex)
  if (!match) {
    throw new Error('queryId is required')
  }
  return match[1]
}

const _extractGetBlockedUsersGraphqlId = once(extractGetBlockedUsersGraphqlId)

export async function getBlockedUsers(options: {
  count: number
  cursor?: string
}) {
  const graphqlId = await _extractGetBlockedUsersGraphqlId()
  if (!graphqlId) {
    throw new Error('Failed to extract get blocked users graphql id')
  }
  const url = new URL(
    `https://x.com/i/api/graphql/${graphqlId}/BlockedAccountsAll`,
  )
  url.searchParams.set(
    'variables',
    JSON.stringify({
      count: options.count,
      cursor: options.cursor,
      includePromotedContent: false,
    }),
  )
  url.searchParams.set(
    'features',
    JSON.stringify(GET_BLOCKED_USERS_GRAPHQL_FLAGS),
  )
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
