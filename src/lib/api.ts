import { z } from 'zod'
import { extractObjects } from './utils'

export async function blockUser(userId: string) {
  if (!userId) {
    throw new Error('userId is required')
  }
  const headers = JSON.parse(localStorage.getItem('requestHeaders') ?? '{}')
  await fetch('https://x.com/i/api/1.1/blocks/create.json', {
    headers: headers,
    referrer: 'https://x.com/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: 'user_id=' + userId,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  })
}

export function parseUserRecords(json: any): UserRecord[] {
  const users: UserRecord[] = []
  const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    screen_name: z.string(),
    location: z.string().nullable(),
    description: z.string().nullable(),
    followers_count: z.number().int(),
    friends_count: z.number().int(),
    verified: z.boolean(),
    created_at: z.string(),
    blocking: z.boolean().optional(),
  })
  users.push(
    ...(
      extractObjects(
        json,
        (obj) => userSchema.safeParse(obj).success,
      ) as (typeof userSchema._type)[]
    ).map((it) => ({
      id: it.id.toString(),
      screen_name: it.screen_name,
      blocking: it.blocking ?? false,
    })),
  )
  const timelineUserSchema = z.object({
    __typename: z.literal('User'),
    rest_id: z.string(),
    legacy: z.object({
      screen_name: z.string(),
      blocking: z.boolean().optional(),
    }),
  })
  users.push(
    ...(
      extractObjects(
        json,
        (obj) => timelineUserSchema.safeParse(obj).success,
      ) as (typeof timelineUserSchema._type)[]
    ).map((it) => ({
      id: it.rest_id,
      screen_name: it.legacy.screen_name,
      blocking: it.legacy.blocking ?? false,
    })),
  )
  return users
}

export interface UserRecord {
  id: string
  screen_name: string
  blocking: boolean
}

export function updateUserRecords(users: UserRecord[]) {
  const cache = JSON.parse(localStorage.getItem('userRecords') ?? '{}')
  localStorage.setItem(
    'userRecords',
    JSON.stringify(
      users.reduce((acc, it) => {
        acc[it.screen_name] = it
        return acc
      }, cache),
    ),
  )
}

export function getUserRecords(): Record<string, UserRecord> {
  const cache = JSON.parse(localStorage.getItem('userRecords') ?? '{}')
  return cache
}
