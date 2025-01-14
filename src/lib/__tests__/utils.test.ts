import { extractObjects } from '$lib/util/extractObjects'
import { it, expect, describe, vi } from 'vitest'
import all from './assets/all.json'
import timeline from './assets/timeline.json'
import { z } from 'zod'
import { parseUserRecords } from '../api'
import allSpam from './assets/all-spam.json'
import { get, omit, uniq } from 'lodash-es'
import notificationsSpam from './assets/notifications-spam.json'

describe('extractObjects', () => {
  it('extractObjects 1', () => {
    const json = {
      users: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    }
    const users = extractObjects(json, (obj) => obj.name)
    expect(users).toEqual([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  })
  it('extractObjects 2', () => {
    const json = {
      users: {
        1: { id: 1, name: 'John' },
        2: { id: 2, name: 'Jane' },
      },
    }
    const users = extractObjects(json, (obj) => obj.name)
    expect(users).toEqual([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  })
  it('extractObjects 3', () => {
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
    })
    const users = extractObjects(
      all,
      (obj) => userSchema.safeParse(obj).success,
    )
    expect(users).length(10)
  })
})

describe('parseUserRecords', () => {
  it('parse timeline', () => {
    const users = parseUserRecords(timeline)
    expect(users).length(20)
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse all-spam', () => {
    const users = parseUserRecords(allSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse notifications-spam', () => {
    const users = parseUserRecords(notificationsSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users.map((it) => it.name).some((it) => it.includes('币圈'))).true
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })
})
