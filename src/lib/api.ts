import { z } from 'zod'
import { extractObjects } from './util/extractObjects'
import { TweetMediaType, User } from './db'
import { TweetFilter } from './filter'

export function setRequestHeaders(headers: Headers) {
  localStorage.setItem(
    'requestHeaders',
    JSON.stringify(Array.from(headers.entries())),
  )
}

export function getRequestHeaders(): Headers {
  return new Headers(JSON.parse(localStorage.getItem('requestHeaders') ?? '{}'))
}

export async function blockUser(user: Pick<User, 'id'>) {
  if (!user.id) {
    throw new Error('userId is required')
  }
  const headers = getRequestHeaders()
  headers.set('content-type', 'application/x-www-form-urlencoded')
  const r = await fetch('https://x.com/i/api/1.1/blocks/create.json', {
    headers,
    referrer: location.href,
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: 'user_id=' + user.id,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })
  if (!r.ok) {
    throw new Error(r.statusText)
  }
}

export async function unblockUser(userId: string) {
  if (!userId) {
    throw new Error('userId is required')
  }
  const headers = getRequestHeaders()
  const r = await fetch('https://x.com/i/api/1.1/blocks/destroy.json', {
    headers: headers,
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

const timelineUserSchema = z.object({
  __typename: z.literal('User'),
  rest_id: z.string(),
  is_blue_verified: z.boolean(),
  legacy: z.object({
    blocking: z.boolean().optional().nullable(),
    following: z.boolean().optional().nullable(),
    screen_name: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
    created_at: z.string().optional(),
    followers_count: z.number().optional(),
    friends_count: z.number().optional(),
    default_profile: z.boolean().optional(),
    default_profile_image: z.boolean().optional(),
  }),
})

function parseTimelineUser(tweetUser: typeof timelineUserSchema._type): User {
  return {
    id: tweetUser.rest_id,
    blocking: tweetUser.legacy.blocking ?? false,
    following: tweetUser.legacy.following ?? false,
    screen_name: tweetUser.legacy.screen_name,
    name: tweetUser.legacy.name,
    description: tweetUser.legacy.description ?? undefined,
    profile_image_url: tweetUser.legacy.profile_image_url_https ?? undefined,
    created_at: tweetUser.legacy.created_at
      ? new Date(tweetUser.legacy.created_at).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
    followers_count: tweetUser.legacy.followers_count,
    friends_count: tweetUser.legacy.friends_count,
    default_profile: tweetUser.legacy.default_profile,
    default_profile_image: tweetUser.legacy.default_profile_image,
    is_blue_verified: tweetUser.is_blue_verified,
  }
}

export function parseUserRecords(json: any): User[] {
  const users: User[] = []
  const userSchema = z.object({
    id_str: z.string(),
    blocking: z.boolean().optional().nullable(),
    following: z.boolean().optional().nullable(),
    screen_name: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
    created_at: z.string().optional(),
    followers_count: z.number().optional(),
    friends_count: z.number().optional(),
    default_profile: z.boolean().optional(),
    default_profile_image: z.boolean().optional(),
    ext_is_blue_verified: z.boolean(),
  })
  users.push(
    ...(
      extractObjects(
        json,
        (obj) => userSchema.safeParse(obj).success,
      ) as (typeof userSchema._type)[]
    ).map(
      (it) =>
        ({
          id: it.id_str,
          screen_name: it.screen_name,
          blocking: it.blocking ?? false,
          following: it.following ?? false,
          name: it.name,
          description: it.description ?? undefined,
          profile_image_url: it.profile_image_url_https ?? undefined,
          created_at: it.created_at
            ? new Date(it.created_at).toISOString()
            : undefined,
          updated_at: new Date().toISOString(),
          followers_count: it.followers_count,
          friends_count: it.friends_count,
          default_profile: it.default_profile,
          default_profile_image: it.default_profile_image,
          is_blue_verified: it.ext_is_blue_verified,
        } satisfies User),
    ),
  )

  users.push(
    ...(
      extractObjects(
        json,
        (obj) => timelineUserSchema.safeParse(obj).success,
      ) as (typeof timelineUserSchema._type)[]
    ).map(parseTimelineUser),
  )
  return users
}

export interface UserRecord {
  id: string
  screen_name: string
  blocking: boolean
}

export const MUTED_WORDS_KEY = 'MASS_BLOCK_TWITTER_MUTED_WORDS'

export const tweetScheam = z.object({
  __typename: z.literal('Tweet').optional(),
  rest_id: z.string(),
  core: z.object({
    user_results: z.object({
      result: timelineUserSchema,
    }),
  }),
  legacy: z.object({
    created_at: z.string(),
    full_text: z.string(),
    user_id_str: z.string(),
    id_str: z.string(),
    entities: z.object({
      media: z
        .array(
          z.object({
            media_url_https: z.string(),
            type: z.union([
              z.literal('photo'),
              z.literal('video'),
              z.literal('animated_gif'),
            ]),
            url: z.string(),
          }),
        )
        .optional(),
    }),
    conversation_id_str: z.string(),
    in_reply_to_status_id_str: z.string().optional(),
    quoted_status_id_str: z.string().optional(),
    lang: z.string(),
  }),
})

export interface ParsedTweet {
  id: string
  text: string
  lang: string // ISO 639-1
  media?: {
    url: string
    type: TweetMediaType
  }[]
  created_at: string
  conversation_id_str: string
  in_reply_to_status_id_str?: string
  quoted_status_id_str?: string
  user: User
}

export function parseTweets(json: any): ParsedTweet[] {
  return (
    extractObjects(
      json,
      (it) => tweetScheam.safeParse(it).success,
    ) as (typeof tweetScheam._type)[]
  ).map((it) => {
    const tweet: ParsedTweet = {
      id: it.rest_id,
      text: it.legacy.full_text,
      created_at: new Date(it.legacy.created_at).toISOString(),
      conversation_id_str: it.legacy.conversation_id_str,
      in_reply_to_status_id_str: it.legacy.in_reply_to_status_id_str,
      quoted_status_id_str: it.legacy.quoted_status_id_str,
      lang: it.legacy.lang,
      user: parseTimelineUser(it.core.user_results.result),
    }
    if (it.legacy.entities.media) {
      tweet.media = it.legacy.entities.media?.map((media) => ({
        url: media.media_url_https,
        type: media.type,
      }))
    }
    return tweet
  })
}

export function filterTweets(
  json: any,
  isShow: (tweet: ParsedTweet) => boolean,
) {
  const addEntriesSchema = z.object({
    type: z.literal('TimelineAddEntries'),
    entries: z.array(
      z.object({
        entryId: z.string(),
        sortIndex: z.string(),
        content: z.object({}),
      }),
    ),
  })
  const [addEntries] = extractObjects(
    json,
    (it) => addEntriesSchema.safeParse(it).success,
  ) as (typeof addEntriesSchema._type)[]
  if (!addEntries) {
    return json
  }
  addEntries.entries = addEntries.entries.filter((it) => {
    const tweets = parseTweets(it)
    return tweets.every(isShow)
  })
  return json
}

export async function extractSearchTimelineGraphqlId(): Promise<string> {
  const linkEl = document.querySelector(
    'link[href^="https://abs.twimg.com/responsive-web/client-web/main."',
  )
  if (!linkEl || !(linkEl instanceof HTMLLinkElement)) {
    throw new Error(
      'link[href^="https://abs.twimg.com/responsive-web/client-web/main."] is required',
    )
  }
  const regex = /queryId:\s*"([^"]+)"[^}]*operationName:\s*"SearchTimeline"/
  const text = await (await fetch(linkEl.href)).text()
  const match = text.match(regex)
  if (!match) {
    throw new Error('queryId is required')
  }
  return match[1]
}

const SEARCH_TIMELINE_FLAGS = {
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
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: false,
  responsive_web_enhance_cards_enabled: false,
}

export function buildSearchTimelineGraphqlUrl(options: {
  term: string
  count: number
  cursor?: string
  graphqlId: string
}): string {
  const url = new URL(
    `https://x.com/i/api/graphql/${options.graphqlId}/SearchTimeline`,
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
  url.searchParams.set('features', JSON.stringify(SEARCH_TIMELINE_FLAGS))
  return url.toString()
}

export function parseSearchPeople(json: any): {
  data: User[]
  cursor: string
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
  )[0].value
  if (!cursor) {
    throw new Error('cursor is required')
  }
  return {
    data: parseUserRecords(json),
    cursor,
  }
}

export async function searchPeople(options: {
  term: string
  count: number
  cursor?: string
}) {
  const graphqlId = await extractSearchTimelineGraphqlId()
  const url = buildSearchTimelineGraphqlUrl({
    ...options,
    graphqlId,
  })
  const headers = getRequestHeaders()
  headers.set('Content-Type', 'application/json')
  const r = await fetch(url, {
    headers,
    referrer: 'https://x.com',
  })
  if (!r.ok) {
    throw new Error(r.statusText)
  }
  const json = await r.json()
  return parseSearchPeople(json)
}
