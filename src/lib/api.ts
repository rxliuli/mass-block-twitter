import { z } from 'zod'
import { extractObjects } from './util/extractObjects'
import { dbApi, TweetMediaType, User } from './db'
import { matchByKeyword } from './util/matchByKeyword'

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
  legacy: z.object({
    blocking: z.boolean().optional().nullable(),
    following: z.boolean().optional().nullable(),
    screen_name: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
    created_at: z.string().optional(),
    followers_count: z.number().optional(),
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
    default_profile: tweetUser.legacy.default_profile,
    default_profile_image: tweetUser.legacy.default_profile_image,
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
    default_profile: z.boolean().optional(),
    default_profile_image: z.boolean().optional(),
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
          default_profile: it.default_profile,
          default_profile_image: it.default_profile_image,
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
  }),
})

export interface ParsedTweet {
  id: string
  text: string
  media?: {
    url: string
    type: TweetMediaType
  }[]
  created_at: string
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
  spamCondition: (tweet: ParsedTweet) => boolean,
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
    let result = true
    tweets.forEach((it) => {
      if (spamCondition(it)) {
        result = false
      }
    })
    return result
  })
  return json
}
