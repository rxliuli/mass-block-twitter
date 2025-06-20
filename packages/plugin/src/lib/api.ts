import { z } from 'zod'
import { extract, extractObjects } from './util/extractObjects'
import { Tweet, User } from './db'
import type { FilterData } from './filter'
import { uniqBy } from 'es-toolkit'
import { get } from 'es-toolkit/compat'
import { ClientTransaction } from './api/x-client-transaction'
import { flowFilterCacheMap } from './shared'

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

export class ExpectedError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
  }
}

export interface BatchBlockUsersProcessedMeta {
  index: number
  total: number
  time: number
  averageTime: number
  wait: number
  error?: unknown
  result?: 'skip'
}

// don't know the rate limit, so limit 2s request once, refer to
// https://devcommunity.x.com/t/what-is-the-rate-limit-on-post-request-and-post-blocks-create/102434/2
// https://github.com/d60/twikit/blob/main/ratelimits.md
export async function batchBlockUsers<T extends User>(
  users: T[] | (() => T[]),
  options: {
    onProcessed: (user: T, meta: BatchBlockUsersProcessedMeta) => Promise<void>
    signal: AbortSignal
    blockUser: (user: T) => Promise<'skip' | undefined>
  },
) {
  const startTime = Date.now()
  let _users = typeof users === 'function' ? users() : users
  let skipCount = 0
  for (let i = 0; i < _users.length; i++) {
    const user = _users[i]
    if (options.signal.aborted) {
      break
    }
    let error: unknown
    let result: undefined | 'skip'
    try {
      result = await options.blockUser(user)
      if (result === 'skip') {
        skipCount++
      }
    } catch (err) {
      error = err
    }
    const time = Date.now() - startTime
    const index = i + 1
    const averageTime = time / Math.max(1, index - skipCount)
    await options.onProcessed(user, {
      index,
      total: _users.length,
      time,
      averageTime,
      wait: (_users.length - index) * averageTime,
      error,
      result,
    })
    _users = typeof users === 'function' ? users() : users
  }
}

const urlSchema = z.object({
  display_url: z.string().optional(),
  expanded_url: z.string().optional(),
  url: z.string(),
})

// Convert _normal suffix to original size image, but keep the extension, and support multiple image formats .jpg .png .gif .webp
// https://pbs.twimg.com/profile_images/1892248257516224513/SzZdRSkx_normal.png
// https://pbs.twimg.com/profile_images/924810703369674752/RIAinmZL_normal.jpg
export function parseProfileImageUrl(url?: string | null): string | undefined {
  if (!url) {
    return
  }
  const i = url.lastIndexOf('.')
  if (i === -1) {
    return url
  }
  const name = url.slice(0, i)
  if (name.endsWith('_normal')) {
    return name.slice(0, -7) + url.slice(i)
  }
  return url
}

export const timelineUserSchema = z.object({
  __typename: z.literal('User'),
  rest_id: z.string(),
  is_blue_verified: z.boolean(),
  // TODO Twitter API breaking change 2025-06-05
  avatar: z
    .object({
      image_url: z.string().optional(),
    })
    .optional(),
  core: z
    .object({
      // Twitter API breaking change
      screen_name: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      created_at: z.string().optional().nullable(),
    })
    .optional(),
  legacy: z.object({
    // TODO deprecated Twitter API breaking change 2025-06-05, use relationship_perspectives.blocking instead
    blocking: z.boolean().optional().nullable(),
    // TODO deprecated Twitter API breaking change 2025-06-05, use relationship_perspectives.following instead
    following: z.boolean().optional().nullable(),
    // TODO deprecated Twitter API breaking change, new API return screen_name/name in core
    screen_name: z.string().optional().nullable(),
    // TODO deprecated Twitter API breaking change, new API return screen_name/name in core
    name: z.string().optional().nullable(),

    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
    created_at: z.string().optional(),
    followers_count: z.number().optional(),
    friends_count: z.number().optional(),
    default_profile: z.boolean().optional(),
    default_profile_image: z.boolean().optional(),
    // TODO deprecated Twitter API breaking change 2025-06-05, use location.location instead
    location: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    entities: z
      .object({
        description: z.object({ urls: z.array(urlSchema) }),
        url: z.object({ urls: z.array(urlSchema) }).optional(),
      })
      .optional(),
  }),
  // TODO new Twitter API breaking change 2025-06-05
  location: z
    .object({
      location: z.string(),
    })
    .optional(),
  // TODO new Twitter API breaking change 2025-06-05
  relationship_perspectives: z
    .object({
      blocking: z.boolean().optional(),
      following: z.boolean(),
    })
    .optional(),
})

export function parseTimelineUser(
  twitterUser: z.infer<typeof timelineUserSchema>,
): User {
  const created_at =
    twitterUser.core?.created_at ?? twitterUser.legacy.created_at
  const user: User = {
    id: twitterUser.rest_id,
    blocking:
      twitterUser.relationship_perspectives?.blocking ??
      twitterUser.legacy.blocking ??
      false,
    following:
      twitterUser.relationship_perspectives?.following ??
      twitterUser.legacy.following ??
      false,
    screen_name: (twitterUser.core?.screen_name ??
      twitterUser.legacy.screen_name)!,
    name: (twitterUser.core?.name ?? twitterUser.legacy.name)!,
    description: twitterUser.legacy.description ?? undefined,
    profile_image_url: parseProfileImageUrl(
      twitterUser.avatar?.image_url ??
        twitterUser.legacy.profile_image_url_https,
    ),
    created_at: created_at ? new Date(created_at).toISOString() : undefined,
    updated_at: new Date().toISOString(),
    followers_count: twitterUser.legacy.followers_count,
    friends_count: twitterUser.legacy.friends_count,
    default_profile: twitterUser.legacy.default_profile,
    default_profile_image: twitterUser.legacy.default_profile_image,
    is_blue_verified: twitterUser.is_blue_verified,
    location:
      twitterUser.location?.location ??
      twitterUser.legacy.location ??
      undefined,
  }
  if (
    twitterUser.legacy.description &&
    twitterUser.legacy.entities?.description?.urls
  ) {
    twitterUser.legacy.entities.description.urls.forEach((url) => {
      if (url.expanded_url) {
        user.description = user.description?.replace(url.url, url.expanded_url)
      }
    })
  }
  if (twitterUser.legacy.url && twitterUser.legacy.entities?.url?.urls) {
    const item = twitterUser.legacy.entities.url.urls.find(
      (it) => it.url === twitterUser.legacy.url,
    )
    if (item) {
      user.url = item.expanded_url
    }
  }
  return user
}

export const notifacationUserSchema = z.object({
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
  ext_is_blue_verified: z.boolean().optional(),
  location: z.string().optional().nullable(),
  url: z.string().nullable(),
  entities: z
    .object({
      description: z.object({ urls: z.array(urlSchema) }),
      url: z.object({ urls: z.array(urlSchema) }).optional(),
    })
    .optional(),
})

function parseNotificationUser(
  twitterUser: z.infer<typeof notifacationUserSchema>,
): User {
  const user: User = {
    id: twitterUser.id_str,
    screen_name: twitterUser.screen_name,
    blocking: twitterUser.blocking ?? false,
    following: twitterUser.following ?? false,
    name: twitterUser.name,
    description: twitterUser.description ?? undefined,
    profile_image_url: parseProfileImageUrl(
      twitterUser.profile_image_url_https,
    ),
    created_at: twitterUser.created_at
      ? new Date(twitterUser.created_at).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
    followers_count: twitterUser.followers_count,
    friends_count: twitterUser.friends_count,
    default_profile: twitterUser.default_profile,
    default_profile_image: twitterUser.default_profile_image,
    is_blue_verified: twitterUser.ext_is_blue_verified,
  }
  if (twitterUser.description && twitterUser.entities?.description.urls) {
    twitterUser.entities.description.urls.forEach((url) => {
      if (url.expanded_url) {
        user.description = user.description?.replace(url.url, url.expanded_url)
      }
    })
  }
  if (twitterUser.url && twitterUser.entities?.url?.urls) {
    const item = twitterUser.entities.url.urls.find(
      (it) => it.url === twitterUser.url,
    )
    if (item) {
      user.url = item.expanded_url
    }
  }
  return user
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
    urls: z.array(urlSchema).optional(),
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
  source: z.string(),
})

function parseLegacyTweet(
  it: z.infer<typeof legacySchema>,
): Omit<ParsedTweet, 'user' | 'source' | 'source_type'> {
  const tweet: Omit<ParsedTweet, 'user' | 'source' | 'source_type'> = {
    id: it.id_str,
    text: it.full_text,
    created_at: new Date(it.created_at).toISOString(),
    conversation_id_str: it.conversation_id_str,
    in_reply_to_status_id_str: it.in_reply_to_status_id_str ?? undefined,
    quoted_status_id_str: it.quoted_status_id_str,
    lang: it.lang,
  }
  if (it.entities.urls) {
    it.entities.urls.forEach((url) => {
      if (url.expanded_url) {
        tweet.text = tweet.text.replace(url.url, url.expanded_url)
      }
    })
  }
  if (it.entities.media) {
    it.entities.media.forEach((media) => {
      if (tweet.text.endsWith(' ' + media.url)) {
        tweet.text = tweet.text.slice(
          0,
          tweet.text.length - media.url.length - 1,
        )
      }
    })
  }
  if (it.entities.media) {
    tweet.media = it.entities.media?.map((media) => ({
      url: media.media_url_https,
      type: media.type,
    }))
  }
  return tweet
}

export interface ParsedTweet extends Omit<Tweet, 'updated_at' | 'user_id'> {
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
        source: tweet.source,
        user: parseNotificationUser(user),
      })
    }
  }
  return result
}

type SourceType =
  | 'iphone'
  | 'ipad'
  | 'android'
  | 'web'
  | 'advertiser'
  | 'grok'
  | 'simpleads-ui'
  | 'unknown'

export function parseSourceType(source: string): SourceType {
  if (source.includes('/download/iphone')) {
    return 'iphone'
  }
  if (source.includes('/download/ipad')) {
    return 'ipad'
  }
  if (source.includes('/download/android')) {
    return 'android'
  }
  if (source.toLowerCase().includes('twitter web app')) {
    return 'web'
  }
  if (source.toLowerCase().includes('advertiser')) {
    return 'advertiser'
  }
  if (source.includes('https://x.ai')) {
    return 'grok'
  }
  if (source.includes('simpleads-ui')) {
    return 'simpleads-ui'
  }
  return 'unknown'
}

export function parseTweet(
  it: z.infer<typeof tweetScheam>,
  context?: {
    json: any
    path: string[]
  },
) {
  const legacyTweet = parseLegacyTweet(it.legacy)
  const tweet: ParsedTweet = {
    ...legacyTweet,
    user: parseTimelineUser(it.core.user_results.result),
    source: it.source,
  }
  if (context) {
    if (isAd(tweet, context)) {
      tweet.is_ad = true
    }
  }
  return tweet
}

function isAd(
  tweet: ParsedTweet,
  context: { path: string[]; json: any },
): boolean {
  const tweetType = parseSourceType(tweet.source)
  if (tweetType === 'advertiser' || tweetType === 'simpleads-ui') {
    return true
  }
  const index = context.path.indexOf('tweet_results')
  if (index === -1) {
    return false
  }
  const promotedMetadata = get(
    context.json,
    context.path.slice(0, index).concat('promotedMetadata'),
  )
  if (promotedMetadata) {
    return true
  }
  return false
}

export function parseTweets(json: any): ParsedTweet[] {
  const notificationTweets = parseNotificationTweets(json)
  if (notificationTweets.length > 0) {
    return notificationTweets
  }
  return (
    extract(json, (it) => tweetScheam.safeParse(it).success) as {
      value: z.infer<typeof tweetScheam>
      path: string[]
    }[]
  ).map((it) => {
    const legacyTweet = parseTweet(it.value, {
      json,
      path: it.path,
    })
    const tweet: ParsedTweet = {
      ...legacyTweet,
      user: parseTimelineUser(it.value.core.user_results.result),
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
const notificationSecurityAlertSchema = z.object({
  icon: z.object({
    id: z.literal('security_alert_icon'),
  }),
  template: templateSchema,
})
const notificationBirdSchema = z.object({
  icon: z.object({
    id: z.literal('bird_icon'),
  }),
  template: templateSchema,
})
const otherSchema = z.object({
  icon: z.object({
    id: z.string(),
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
          notificationSecurityAlertSchema,
          otherSchema,
        ]),
      )
      .optional(),
    tweets: z.record(legacySchema.extend({ source: z.string() })).optional(),
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
        source: tweet.source,
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
      .union([
        z.object({
          result: tweetScheam,
        }),
        z.object({}),
      ])
      .optional(),
  })
  const originalTweets = extract(
    entrie,
    (it) => extendedTweetSchema.safeParse(it).success,
  ) as {
    value: z.infer<typeof extendedTweetSchema>
    path: string[]
  }[]
  const tweets = originalTweets.map((it) => {
    const legacyTweet = parseTweet(it.value, {
      json: entrie,
      path: it.path,
    })
    const tweet: ParsedTweet = {
      ...legacyTweet,
      user: parseTimelineUser(it.value.core.user_results.result),
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
    // delete originalTweets[0].value.quoted_status_result
    flowFilterCacheMap.set('tweet:' + tweets[1].id, { value: true })
    flowFilterCacheMap.set('user:' + tweets[1].user.id, { value: true })
    return true
  }
  return tweets.every(isShow)
}

// notification page
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

// timeline or detail page
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

// ref: https://antibot.blog/posts/1741552163416
// ref: https://blog.nest.moe/posts/twitter-header-part-4
// let _2DArray: number[][]
// export function getXTransactionId() {
//   function encode(n: number[]) {
//     return btoa(
//       Array.from(n)
//         ['map']((n) => String['fromCharCode'](n))
//         ['join'](''),
//     )['replace'](/=/g, '')
//   }
//   function getKey() {
//     // <meta name="twitter-site-verification" content="mentUHYU4+1yPz30fM6/IcNS+stghA1baFhBkGzE7075BPd15lUcDqC/RaF4jR+b"/>
//     const n = document
//       .querySelectorAll('[name^=tw]')[0]
//       .getAttribute('content')!
//     return new Uint8Array(
//       atob(n)
//         ['split']('')
//         ['map']((n) => n['charCodeAt'](0)),
//     )
//   }
//   function get2DArray(name: string, KEY: Uint8Array<ArrayBuffer>) {
//     if (_2DArray) {
//       return _2DArray
//     }
//     // loading-x-anim-0, loading-x-anim-1, etc. to 3
//     _2DArray = [
//       ...document.querySelectorAll('[id^=loading-x-anim-]>g>path:nth-child(2)'),
//     ]
//       .map((node) => node.getAttribute('d'))[0]!
//       ['substring'](9)
//       ['split']('C')
//       ['map']((n) =>
//         n['replace'](/[^\d]+/g, ' ')
//           ['trim']()
//           ['split'](' ')
//           ['map'](Number),
//       )
//     return _2DArray
//   }
//   function toHex(n: number) {
//     return (n < 16 ? '0' : '') + n['toString'](16)
//   }
//   function getElements(n: NodeListOf<Element> | HTMLDivElement[]) {
//     return Array.from(n)['map']((n) => {
//       var W
//       return null != (W = n['parentElement']) && W['removeChild'](n), n
//     })
//   }
//   function createDiv() {
//     const n = document['createElement']('div')
//     return document['body']['append'](n), [n, () => getElements([n])]
//   }
//   function doAnimation(
//     newDiv: HTMLElement,
//     numArr: number[],
//     frameTime: number,
//   ) {
//     if (!newDiv['animate']) return
//     const r = newDiv['animate'](
//       {
//         color: [
//           '#' + toHex(numArr[0]) + toHex(numArr[1]) + toHex(numArr[2]),
//           '#' + toHex(numArr[3]) + toHex(numArr[4]) + toHex(numArr[5]),
//         ],
//         transform: [
//           'rotate(0deg)',
//           'rotate(' + _r(numArr[6], 60, 360, !0) + 'deg)',
//         ],
//         easing:
//           'cubic-bezier(' +
//           Array.from(numArr['slice'](7))
//             ['map']((n, W) => _r(n, W % 2 ? -1 : 0, 1))
//             ['join']() +
//           ')',
//       },
//       4096,
//     )
//     r['pause']()
//     r['currentTime'] = Math.round(frameTime / 10) * 10
//   }
//   const XOR = (n: number, W: number, t: Uint8Array<ArrayBuffer>) =>
//     W ? n ^ t[0] : n
//   const _r = (n: number, W: number, t: number, r?: boolean) => {
//     const o = (n * (t - W)) / 255 + W
//     return r ? Math.floor(o) : o['toFixed'](2)
//   }
//   let animationStr: string
//   const setAnimationStr = (KEY: Uint8Array<ArrayBuffer>) => {
//     const [index, frameTime] = [
//         KEY[6] % 16,
//         (KEY[16] % 16) * (KEY[14] % 16) * (KEY[7] % 16),
//       ],
//       arr = get2DArray('.r-32hy0', KEY)
//     const [newDiv, deleteDiv] = createDiv()
//     // @ts-ignore
//     doAnimation(newDiv, arr[index], frameTime)
//     // @ts-ignore
//     const style = getComputedStyle(newDiv)
//     animationStr = Array.from(
//       ('' + style['color'] + style['transform'])['matchAll'](/([\d.-]+)/g),
//     )
//       ['map']((n) => Number(Number(n[0])['toFixed'](2))['toString'](16))
//       ['join']('')
//       ['replace'](/[.-]/g, '')
//     // @ts-ignore
//     deleteDiv()
//   }
//   function getTextEncoder(text: string) {
//     return typeof text == 'string' ? new TextEncoder()['encode'](text) : text
//   }
//   function sha256(textEncoder: Uint8Array<ArrayBuffer>) {
//     return crypto.subtle['digest']('sha-256', textEncoder)
//   }
//   return async (path: string, method: string) => {
//     const time = Math.floor((Date['now']() - 1682924400 * 1e3) / 1e3),
//       timeBuffer = new Uint8Array(new Uint32Array([time])['buffer']),
//       KEY = getKey()
//     if (!animationStr) {
//       setAnimationStr(KEY)
//     }
//     let XOR_BYTE = [Math.random() * 256]
//     let sha256Hash = await sha256(
//       // @ts-ignore
//       getTextEncoder([method, path, time]['join']('!') + 'bird' + animationStr),
//     )
//     let shaBytes = Array.from(new Uint8Array(sha256Hash))
//     return encode(
//       // @ts-ignore
//       new Uint8Array(
//         XOR_BYTE['concat'](
//           Array.from(KEY),
//           Array.from(timeBuffer),
//           shaBytes.slice(0, 16),
//           [1],
//         ),
//       )['map'](XOR),
//     )
//   }
// }

// export function initXTransactionId() {
//   const observer = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//       mutation.addedNodes.forEach((node) => {
//         if (node instanceof SVGElement && node.id === 'loading-x-anim-0') {
//           getXTransactionId()('/i/api/1.1/blocks/create.json', 'POST')
//           observer.disconnect()
//         }
//       })
//     })
//   })
//   observer.observe(document, {
//     childList: true,
//     subtree: true,
//   })
// }

export const xClientTransaction = new ClientTransaction()
