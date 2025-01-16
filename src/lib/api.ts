import { z } from 'zod'
import { extractObjects } from './util/extractObjects'
import { dbApi, User } from './db'
import { matchByKeyword } from './util/matchByKeyword'

export async function blockUser(user: Pick<User, 'id' | 'screen_name'>) {
  if (!user.id || !user.screen_name) {
    throw new Error('userId is required')
  }
  const headers = new Headers(
    JSON.parse(localStorage.getItem('requestHeaders') ?? '{}'),
  )
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
    blocking: z.boolean().optional().nullable(),
    following: z.boolean().optional().nullable(),
    screen_name: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    profile_image_url_https: z.string().optional().nullable(),
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies User),
    ),
  )
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
          following: it.legacy.following ?? false,
          screen_name: it.legacy.screen_name,
          name: it.legacy.name,
          description: it.legacy.description ?? undefined,
          profile_image_url: it.legacy.profile_image_url_https ?? undefined,
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

export async function autoBlockUsers(users: User[]): Promise<User[]> {
  const keywordStr = localStorage.getItem('blockKeywords')
  if (!keywordStr || keywordStr.length === 0) {
    console.debug('No keywords to block')
    return []
  }
  const keywords = keywordStr
    .split('\n')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)
  const filteredUsers = users.filter(
    (it) =>
      !it.following &&
      !it.blocking &&
      keywords.some((keyword) =>
        matchByKeyword(keyword, [it.screen_name, it.name, it.description]),
      ),
  )
  if (filteredUsers.length === 0) {
    console.debug('No users to block')
    return []
  }
  let blockedUsers: User[] = []
  for (const user of filteredUsers) {
    try {
      const isBlocking = await dbApi.users.isBlocking(user.id)
      if (isBlocking) {
        continue
      }
      console.debug(`Blocking ${user.screen_name}`)
      await dbApi.users.block(user)
      await blockUser(user)
      blockedUsers.push(user)
    } catch (e) {}
  }
  console.debug(
    `Blocked ${blockedUsers.length} users, failed ${
      filteredUsers.length - blockedUsers.length
    } users`,
  )

  return blockedUsers
}
