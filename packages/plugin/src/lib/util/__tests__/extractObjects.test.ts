import { describe, expect, it } from 'vitest'
import { extract, extractObjects } from '../extractObjects'
import { z } from 'zod'
import all from './assets/all.json'

describe('extractObjects', () => {
  it('extractObjects from array', () => {
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
  it('extractObjects from object', () => {
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
  it('extractObjects from response', () => {
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
  it('extract path', () => {
    const json = {
      users: {
        1: { id: 1, name: 'John' },
      },
      relations: [{ id: 1, name: 'Hello, world!' }],
    }
    const users = extract(json, (obj) => obj.name)
    expect(users).length(2)
    expect(users[0].path).toEqual(['users', '1'])
    expect(users[1].path).toEqual(['relations', '0'])
  })
})
