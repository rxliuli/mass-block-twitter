import { z } from 'zod'
import { extractObjects } from './util/extractObjects'
import { dbApi, User } from './db'
import { matchByKeyword } from './util/matchByKeyword'

export async function blockUser(userId: string) {
  if (!userId) {
    throw new Error('userId is required')
  }
  const headers = JSON.parse(localStorage.getItem('requestHeaders') ?? '{}')
  const r = await fetch('https://x.com/i/api/1.1/blocks/create.json', {
    headers: headers,
    referrer: 'https://x.com/',
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

export async function unblockUser(userId: string) {
  if (!userId) {
    throw new Error('userId is required')
  }
  const headers = JSON.parse(localStorage.getItem('requestHeaders') ?? '{}')
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

export function parseUserRecords(json: any): User[] {
  const users: User[] = []
  const userSchema = z.object({
    id_str: z.string(),
    blocking: z.boolean().optional(),
    screen_name: z.string(),
    name: z.string(),
    description: z.string().optional(),
    profile_image_url_https: z.string().optional(),
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
          name: it.name,
          description: it.description,
          profile_image_url: it.profile_image_url_https,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies User),
    ),
  )
  const timelineUserSchema = z.object({
    __typename: z.literal('User'),
    rest_id: z.string(),
    legacy: z.object({
      blocking: z.boolean().optional(),
      screen_name: z.string(),
      name: z.string(),
      description: z.string().optional(),
      profile_image_url_https: z.string().optional(),
    }),
  })
  users.push(
    ...(
      extractObjects(
        json,
        (obj) => timelineUserSchema.safeParse(obj).success,
      ) as (typeof timelineUserSchema._type)[]
    ).map(
      (it) =>
        ({
          id: it.rest_id,
          blocking: it.legacy.blocking ?? false,
          screen_name: it.legacy.screen_name,
          name: it.legacy.name,
          description: it.legacy.description,
          profile_image_url: it.legacy.profile_image_url_https,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies User),
    ),
  )
  return users
}

export interface UserRecord {
  id: string
  screen_name: string
  blocking: boolean
}

export async function autoBlockUsers(users: User[]) {
  const keywordStr = localStorage.getItem('blockKeywords')
  if (!keywordStr || keywordStr.length === 0) {
    console.log('No keywords to block')
    return
  }
  const keywords = keywordStr
    .split('\n')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)
  const filteredUsers = users.filter((it) =>
    keywords.some((keyword) =>
      matchByKeyword(it.screen_name, keyword) ||
      matchByKeyword(it.name, keyword) ||
      it.description
        ? matchByKeyword(it.description ?? '', keyword)
        : false,
    ),
  )
  const success: string[] = []
  const failed: string[] = []
  for (const user of filteredUsers) {
    if (user.blocking) {
      continue
    }
    try {
      const isBlocking = await dbApi.users.isBlocking(user.id)
      if (isBlocking) {
        continue
      }
      await blockUser(user.id)
      success.push(user.screen_name)
    } catch (e) {
      failed.push(user.screen_name)
    }
  }
  console.log(`Blocked ${success.join(', ')}, failed ${failed.join(', ')}`)
}
