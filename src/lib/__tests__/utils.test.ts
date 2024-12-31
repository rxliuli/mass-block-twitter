import { extractObjects } from '$lib/util/extractObjects'
import { it, expect, describe } from 'vitest'
import all from './assets/all.json'
import timeline from './assets/timeline.json'
import { z } from 'zod'
import { parseUserRecords } from '../api'
import allSpam from './assets/all-spam.json'
import { get, uniq } from 'lodash-es'

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
  })

  it('parse all-spam', () => {
    expect(
      uniq(
        extractObjects(allSpam, (it) =>
          get(it, 'legacy.name')?.startsWith('比特币'),
        ).map((it) => it.legacy.screen_name),
      ).length,
    ).eq(uniq(parseUserRecords(allSpam).map((it) => it.screen_name)).length)
  })
})
