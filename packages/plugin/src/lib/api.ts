import { z } from 'zod'
import { extractObjects } from './util/extractObjects'
import { TweetMediaType, User } from './db'
import { FilterData } from './filter'
import { uniqBy } from 'lodash-es'

export function setRequestHeaders(headers: Headers) {
  const old = getRequestHeaders()
  headers.forEach((value, key) => {
    old.set(key, value)
  })
  localStorage.setItem(
    'requestHeaders',
    JSON.stringify(Array.from(old.entries())),
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
    location: z.string().optional().nullable(),
  }),
})

function parseTimelineUser(
  tweetUser: z.infer<typeof timelineUserSchema>,
): User {
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
    location: tweetUser.legacy.location ?? undefined,
  }
}

const notifacationUserSchema = z.object({
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
  location: z.string().optional().nullable(),
})
function parseNotificationUser(
  user: z.infer<typeof notifacationUserSchema>,
): User {
  return {
    id: user.id_str,
    screen_name: user.screen_name,
    blocking: user.blocking ?? false,
    following: user.following ?? false,
    name: user.name,
    description: user.description ?? undefined,
    profile_image_url: user.profile_image_url_https ?? undefined,
    created_at: user.created_at
      ? new Date(user.created_at).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
    followers_count: user.followers_count,
    friends_count: user.friends_count,
    default_profile: user.default_profile,
    default_profile_image: user.default_profile_image,
    is_blue_verified: user.ext_is_blue_verified,
  }
}
export function parseUserRecords(json: any): User[] {
  const users: User[] = []
  users.push(
    ...(
      extractObjects(
        json,
        (obj) => notifacationUserSchema.safeParse(obj).success,
      ) as (typeof notifacationUserSchema._type)[]
    ).map(parseNotificationUser),
  )

  users.push(
    ...(
      extractObjects(
        json,
        (obj) => timelineUserSchema.safeParse(obj).success,
      ) as (typeof timelineUserSchema._type)[]
    ).map(parseTimelineUser),
  )
  return uniqBy(users, (it) => it.id)
}

export interface UserRecord {
  id: string
  screen_name: string
  blocking: boolean
}

export const MUTED_WORDS_KEY = 'MASS_BLOCK_TWITTER_MUTED_WORDS'
export const MUTED_WORD_RULES_KEY = 'MASS_BLOCK_TWITTER_MUTED_WORD_RULES'

const legacySchema = z.object({
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
  in_reply_to_status_id_str: z.string().optional().nullable(),
  quoted_status_id_str: z.string().optional(),
  lang: z.string(),
})
export const tweetScheam = z.object({
  __typename: z.literal('Tweet').optional(),
  rest_id: z.string(),
  core: z.object({
    user_results: z.object({
      result: timelineUserSchema,
    }),
  }),
  legacy: legacySchema,
})

function parseLegacyTweet(
  it: z.infer<typeof legacySchema>,
): Omit<ParsedTweet, 'user'> {
  const tweet: Omit<ParsedTweet, 'user'> = {
    id: it.id_str,
    text: it.full_text,
    created_at: new Date(it.created_at).toISOString(),
    conversation_id_str: it.conversation_id_str,
    in_reply_to_status_id_str: it.in_reply_to_status_id_str ?? undefined,
    quoted_status_id_str: it.quoted_status_id_str,
    lang: it.lang,
  }
  if (it.entities.media) {
    tweet.media = it.entities.media?.map((media) => ({
      url: media.media_url_https,
      type: media.type,
    }))
  }
  return tweet
}

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

function parseNotificationTweets(json: any): ParsedTweet[] {
  const validated = notificationSchema.safeParse(json)
  if (validated.error) {
    return []
  }
  const _json = json as z.infer<typeof notificationSchema>
  const tweets = _json.globalObjects.tweets
  if (!tweets) {
    return []
  }
  const result: ParsedTweet[] = []
  for (const key in tweets) {
    const tweet = tweets[key]
    const user = _json.globalObjects.users?.[tweet.user_id_str]
    if (user) {
      result.push({
        ...parseLegacyTweet(tweet),
        user: parseNotificationUser(user),
      })
    }
  }
  return result
}

export function parseTweet(it: z.infer<typeof tweetScheam>) {
  const legacyTweet = parseLegacyTweet(it.legacy)
  const tweet: ParsedTweet = {
    ...legacyTweet,
    user: parseTimelineUser(it.core.user_results.result),
  }
  return tweet
}
export function parseTweets(json: any): ParsedTweet[] {
  const notificationTweets = parseNotificationTweets(json)
  if (notificationTweets.length > 0) {
    return notificationTweets
  }
  return (
    extractObjects(json, (it) => tweetScheam.safeParse(it).success) as z.infer<
      typeof tweetScheam
    >[]
  ).map((it) => {
    const legacyTweet = parseLegacyTweet(it.legacy)
    const tweet: ParsedTweet = {
      ...legacyTweet,
      user: parseTimelineUser(it.core.user_results.result),
    }
    return tweet
  })
}

const templateSchema = z.object({
  aggregateUserActionsV1: z.object({
    fromUsers: z.array(
      z.object({
        user: z.object({
          id: z.string(),
        }),
      }),
    ),
  }),
})
const notificationLikeSchema = z.object({
  icon: z.object({
    id: z.literal('heart_icon'),
  }),
  template: templateSchema,
})
const notificationFollwingSchema = z.object({
  icon: z.object({
    id: z.literal('person_icon'),
  }),
  template: templateSchema,
})
const notificationRetweetSchema = z.object({
  icon: z.object({
    id: z.literal('retweet_icon'),
  }),
  template: templateSchema,
})
const notificationCommunitiesSchema = z.object({
  icon: z.object({
    id: z.literal('communities_icon'),
  }),
  template: templateSchema,
})
const notificationBirdSchema = z.object({
  icon: z.object({
    id: z.literal('bird_icon'),
  }),
  template: templateSchema,
})
const notificationSchema = z.object({
  globalObjects: z.object({
    notifications: z
      .record(
        z.union([
          notificationFollwingSchema,
          notificationLikeSchema,
          notificationCommunitiesSchema,
          notificationRetweetSchema,
          notificationBirdSchema,
        ]),
      )
      .optional(),
    tweets: z.record(legacySchema).optional(),
    users: z.record(notifacationUserSchema).optional(),
  }),
  timeline: z.object({
    instructions: z.array(
      z.object({
        addEntries: z
          .object({
            entries: z.array(
              z.object({
                entryId: z.string(),
                sortIndex: z.string(),
                content: z.object({
                  item: z
                    .object({
                      content: z.object({
                        notification: z
                          .object({
                            id: z.string(),
                            fromUsers: z.array(z.string()),
                          })
                          .optional(),
                        tweet: z
                          .object({
                            id: z.string(),
                            displayType: z.literal('Tweet'),
                          })
                          .optional(),
                      }),
                    })
                    .optional(),
                }),
              }),
            ),
          })
          .optional(),
      }),
    ),
  }),
})

export function filterNotifications(
  data: z.infer<typeof notificationSchema>,
  isShow: (data: FilterData) => boolean,
): z.infer<typeof notificationSchema> {
  const _json = JSON.parse(JSON.stringify(data)) as z.infer<
    typeof notificationSchema
  >
  const validated = notificationSchema.safeParse(_json)
  if (validated.error) {
    console.error('filterNotifications', validated.error)
    return data
  }
  const users = parseUserRecords(_json.globalObjects.users)
  for (const key in _json.globalObjects.notifications) {
    const it = _json.globalObjects.notifications[key]
    if (it.icon.id === 'heart_icon') {
      const fromUsers = it.template.aggregateUserActionsV1.fromUsers.filter(
        (fromUser) => {
          const user = users.find((it) => it.id === fromUser.user.id)
          // if user is not found, it means the user is not a twitter user, so we should show the notification
          if (!user) {
            return true
          }
          return isShow({ type: 'user', user })
        },
      )
      if (fromUsers.length > 0) {
        it.template.aggregateUserActionsV1.fromUsers = fromUsers
      } else {
        delete _json.globalObjects.notifications[key]
      }
    }
  }
  const removeTweetIds: string[] = []
  for (const key in _json.globalObjects.tweets) {
    const tweet = _json.globalObjects.tweets[key]
    const user = _json.globalObjects.users?.[tweet.user_id_str]
    if (user) {
      const parsedTweet: ParsedTweet = {
        ...parseLegacyTweet(tweet),
        user: parseNotificationUser(user),
      }
      if (!isShow({ type: 'tweet', tweet: parsedTweet })) {
        delete _json.globalObjects.tweets[key]
        removeTweetIds.push(tweet.id_str)
      }
    }
  }
  const addEntries = _json.timeline.instructions.find(
    (it) => it.addEntries?.entries,
  )
  if (addEntries?.addEntries?.entries) {
    addEntries.addEntries.entries = addEntries.addEntries.entries.filter(
      (it) =>
        !removeTweetIds.includes(it.content.item?.content.tweet?.id ?? ''),
    )
  }
  return _json
}

function filterEntrie(
  entrie: any,
  isShow: (tweet: ParsedTweet) => boolean,
): boolean {
  const extendedTweetSchema = tweetScheam.extend({
    quoted_status_result: z
      .object({
        result: tweetScheam,
      })
      .optional(),
  })
  const originalTweets = extractObjects(
    entrie,
    (it) => extendedTweetSchema.safeParse(it).success,
  ) as z.infer<typeof extendedTweetSchema>[]
  const tweets = originalTweets.map((it) => {
    const legacyTweet = parseLegacyTweet(it.legacy)
    const tweet: ParsedTweet = {
      ...legacyTweet,
      user: parseTimelineUser(it.core.user_results.result),
    }
    return tweet
  })
  if (tweets.length === 2) {
    const showMain = isShow(tweets[0])
    const showQuote = isShow(tweets[1])
    // if main tweet is not show, return false
    if (!showMain) {
      return false
    }
    // if quote tweet is show, return true
    if (showQuote) {
      return true
    }
    // if quote tweet is not show, but main tweet is show, remove the quote tweet
    delete originalTweets[0].quoted_status_result
    return true
  }
  return tweets.every(isShow)
}

function filterTimelineAddToModule(
  json: any,
  isShow: (tweet: ParsedTweet) => boolean,
): {
  matched: boolean
  data: any
} {
  const addToModulesSchema = z.object({
    type: z.literal('TimelineAddToModule'),
    moduleItems: z.array(
      z.object({
        entryId: z.string(),
        item: z.object({}),
      }),
    ),
  })
  const [addToModules] = extractObjects(
    json,
    (it) => addToModulesSchema.safeParse(it).success,
  ) as (typeof addToModulesSchema._type)[]
  if (!addToModules) {
    return {
      matched: false,
      data: json,
    }
  }
  if (!addToModules) {
    return {
      matched: false,
      data: json,
    }
  }
  addToModules.moduleItems = addToModules.moduleItems.filter((it) =>
    filterEntrie(it, isShow),
  )
  return {
    matched: true,
    data: json,
  }
}

function filterTimelineAddEntries(
  json: any,
  isShow: (tweet: ParsedTweet) => boolean,
): {
  matched: boolean
  data: any
} {
  const addEntriesSchema = z.object({
    type: z.literal('TimelineAddEntries'),
    entries: z.array(
      z.object({
        entryId: z.string(),
        content: z.object({}),
      }),
    ),
  })
  const [addEntries] = extractObjects(
    json,
    (it) => addEntriesSchema.safeParse(it).success,
  ) as (typeof addEntriesSchema._type)[]
  if (!addEntries) {
    return {
      matched: false,
      data: json,
    }
  }
  addEntries.entries = addEntries.entries.filter((it) =>
    filterEntrie(it, isShow),
  )
  return {
    matched: true,
    data: json,
  }
}

export function filterTweets(
  json: any,
  isShow: (tweet: ParsedTweet) => boolean,
) {
  const r1 = filterTimelineAddEntries(json, isShow)
  if (r1.matched) {
    return r1.data
  }
  const r2 = filterTimelineAddToModule(json, isShow)
  if (r2.matched) {
    return r2.data
  }
  console.error('filterTweets not parsed', json)
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
  responsive_web_grok_image_annotation_enabled: true,
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
  const xTransactionId = await getXTransactionId()(new URL(url).pathname, 'GET')
  const r = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language':
        'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
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
    referrer: 'https://x.com',
  })
  if (!r.ok) {
    throw r
  }
  const json = await r.json()
  return parseSearchPeople(json)
}

let _2DArray: number[][]
export function getXTransactionId() {
  function encode(n: number[]) {
    return btoa(
      Array.from(n)
        ['map']((n) => String['fromCharCode'](n))
        ['join'](''),
    )['replace'](/=/g, '')
  }
  function getKey() {
    // <meta name="twitter-site-verification" content="mentUHYU4+1yPz30fM6/IcNS+stghA1baFhBkGzE7075BPd15lUcDqC/RaF4jR+b"/>
    const n = document
      .querySelectorAll('[name^=tw]')[0]
      .getAttribute('content')!
    return new Uint8Array(
      atob(n)
        ['split']('')
        ['map']((n) => n['charCodeAt'](0)),
    )
  }
  function get2DArray(name: string, KEY: Uint8Array<ArrayBuffer>) {
    if (_2DArray) {
      return _2DArray
    }
    // loading-x-anim-0, loading-x-anim-1, etc. to 3
    _2DArray = [
      ...document.querySelectorAll('[id^=loading-x-anim-]>g>path:nth-child(2)'),
    ]
      .map((node) => node.getAttribute('d'))[0]!
      ['substring'](9)
      ['split']('C')
      ['map']((n) =>
        n['replace'](/[^\d]+/g, ' ')
          ['trim']()
          ['split'](' ')
          ['map'](Number),
      )
    return _2DArray
  }
  function toHex(n: number) {
    return (n < 16 ? '0' : '') + n['toString'](16)
  }
  function getElements(n: NodeListOf<Element> | HTMLDivElement[]) {
    return Array.from(n)['map']((n) => {
      var W
      return null != (W = n['parentElement']) && W['removeChild'](n), n
    })
  }
  function createDiv() {
    const n = document['createElement']('div')
    return document['body']['append'](n), [n, () => getElements([n])]
  }
  function doAnimation(
    newDiv: HTMLElement,
    numArr: number[],
    frameTime: number,
  ) {
    if (!newDiv['animate']) return
    const r = newDiv['animate'](
      {
        color: [
          '#' + toHex(numArr[0]) + toHex(numArr[1]) + toHex(numArr[2]),
          '#' + toHex(numArr[3]) + toHex(numArr[4]) + toHex(numArr[5]),
        ],
        transform: [
          'rotate(0deg)',
          'rotate(' + _r(numArr[6], 60, 360, !0) + 'deg)',
        ],
        easing:
          'cubic-bezier(' +
          Array.from(numArr['slice'](7))
            ['map']((n, W) => _r(n, W % 2 ? -1 : 0, 1))
            ['join']() +
          ')',
      },
      4096,
    )
    r['pause']()
    r['currentTime'] = Math.round(frameTime / 10) * 10
  }
  const XOR = (n: number, W: number, t: Uint8Array<ArrayBuffer>) =>
    W ? n ^ t[0] : n
  const _r = (n: number, W: number, t: number, r?: boolean) => {
    const o = (n * (t - W)) / 255 + W
    return r ? Math.floor(o) : o['toFixed'](2)
  }
  let animationStr: string
  const setAnimationStr = (KEY: Uint8Array<ArrayBuffer>) => {
    const [index, frameTime] = [
        KEY[2] % 16,
        (KEY[12] % 16) * (KEY[14] % 16) * (KEY[7] % 16),
      ],
      arr = get2DArray('.r-32hy0', KEY)
    const [newDiv, deleteDiv] = createDiv()
    // @ts-ignore
    doAnimation(newDiv, arr[index], frameTime)
    // @ts-ignore
    const style = getComputedStyle(newDiv)
    animationStr = Array.from(
      ('' + style['color'] + style['transform'])['matchAll'](/([\d.-]+)/g),
    )
      ['map']((n) => Number(Number(n[0])['toFixed'](2))['toString'](16))
      ['join']('')
      ['replace'](/[.-]/g, '')
    // @ts-ignore
    deleteDiv()
  }
  function getTextEncoder(text: string) {
    return typeof text == 'string' ? new TextEncoder()['encode'](text) : text
  }
  function sha256(textEncoder: Uint8Array<ArrayBuffer>) {
    return crypto.subtle['digest']('sha-256', textEncoder)
  }
  return async (path: string, method: string) => {
    const time = Math.floor((Date['now']() - 1682924400 * 1e3) / 1e3),
      timeBuffer = new Uint8Array(new Uint32Array([time])['buffer']),
      KEY = getKey()
    if (!animationStr) {
      setAnimationStr(KEY)
    }
    let XOR_BYTE = [Math.random() * 256]
    let sha256Hash = await sha256(
      // @ts-ignore
      getTextEncoder([method, path, time]['join']('!') + 'bird' + animationStr),
    )
    let shaBytes = Array.from(new Uint8Array(sha256Hash))
    return encode(
      // @ts-ignore
      new Uint8Array(
        XOR_BYTE['concat'](
          Array.from(KEY),
          Array.from(timeBuffer),
          shaBytes.slice(0, 16),
          [1],
        ),
      )['map'](XOR),
    )
  }
}

export function initXTransactionId() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof SVGElement && node.id === 'loading-x-anim-0') {
          getXTransactionId()('/i/api/1.1/blocks/create.json', 'POST')
          observer.disconnect()
        }
      })
    })
  })
  observer.observe(document, {
    childList: true,
    subtree: true,
  })
}
