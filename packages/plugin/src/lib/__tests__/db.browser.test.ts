import { Activity, dbApi, initDB, Tweet, User } from '$lib/db'
import dayjs from 'dayjs'
import { range, rangeRight } from 'es-toolkit'
import { ulid } from 'ulidx'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(async () => {
  await initDB()
  await dbApi.clear()
})
describe('activity', () => {
  it('should be able to get by page', async () => {
    const r1 = await dbApi.activitys.getByPage({ limit: 10 })
    expect(r1.data.length).toBe(0)
    await dbApi.activitys.record(
      Array.from({ length: 10 }, () => ({
        id: ulid().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Activity[],
    )
    const r2 = await dbApi.activitys.getByPage({ limit: 1 })
    expect(r2.data.length).toBe(1)
    const r3 = await dbApi.activitys.getByPage({
      limit: 10,
      cursor: r2.cursor,
    })
    expect(r3.data.length).toBe(9)
    expect(r3.cursor).undefined
  })
})
describe('user', () => {
  it('should be able to get by page', async () => {
    await dbApi.users.record(
      Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        updated_at: new Date(`2025-03-12T0${i}:00:00.000Z`).toISOString(),
        blocking: true,
      })) as User[],
    )
    const r1 = await dbApi.users.getByPage({ limit: 1 })
    expect(r1.data.length).toBe(1)
    const r2 = await dbApi.users.getByPage({ limit: 10, cursor: r1.cursor })
    expect(r2.data.length).toBe(9)
    expect(r2.cursor).undefined
  })
  it('should be able to get by duplicate updated_at', async () => {
    await dbApi.users.record(
      Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        updated_at: new Date().toISOString(),
        blocking: true,
      })) as User[],
    )
    const r1 = await dbApi.users.getByPage({ limit: 1 })
    expect(r1.data.length).toBe(1)
    expect(r1.data[0].id).toBe('9')
    const r2 = await dbApi.users.getByPage({ limit: 10, cursor: r1.cursor })
    expect(r2.data.length).toBe(9)
    expect(r2.cursor).undefined
  })
  it('should be able to record thousands of users', async () => {
    await Promise.all(
      range(10).map(() => {
        dbApi.users.record(
          range(1000).map((i) => ({
            id: i.toString(),
            updated_at: new Date().toISOString(),
            blocking: true,
          })) as User[],
        )
      }),
    )
    await dbApi.users.record(
      range(10000, 20000).map((i) => ({
        id: i.toString(),
        updated_at: new Date().toISOString(),
        blocking: true,
      })) as User[],
    )
  })
})
describe('pending check user', () => {
  beforeEach(async () => {
    await dbApi.users.record(
      Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        updated_at: new Date().toISOString(),
        blocking: true,
        followers_count: 10,
        friends_count: 10,
        is_blue_verified: false,
      })) as User[],
    )
  })
  const listPendingCheckUsers = async () => {
    const r = []
    for await (const element of dbApi.pendingCheckUsers.keys()) {
      r.push(...element)
    }
    return r
  }
  it('should be able to record', async () => {
    await dbApi.pendingCheckUsers.record(['1', '2'])
    const r = await listPendingCheckUsers()
    expect(r.map((it) => it.user.id)).toEqual(['1', '2'])
  })
  it('should be able to update status', async () => {
    await dbApi.pendingCheckUsers.record(['1', '2'])
    expect((await listPendingCheckUsers()).map((it) => it.user.id)).toEqual([
      '1',
      '2',
    ])
    await dbApi.pendingCheckUsers.uploaded(['1', '2'])
    expect((await listPendingCheckUsers()).map((it) => it.user.id)).toEqual([])
  })
  it('should be able to get tweets', async () => {
    const now = dayjs()
    await dbApi.tweets.record(
      range(0, 100).map((i) => ({
        id: i.toString(),
        user_id: '1',
        created_at: now.add(i, 'milliseconds').toISOString(),
      })) as Tweet[],
    )
    await dbApi.pendingCheckUsers.record(['1'])
    const r = await listPendingCheckUsers()
    expect(r).length(1)
    expect(r[0].user.id).toBe('1')
    expect(r[0].tweets.length).toBe(10)
    expect(r[0].tweets.map((it) => it.id)).toEqual(
      rangeRight(90, 100).map(String),
    )
  })
  it('should be able to record duplicate', async () => {
    await dbApi.pendingCheckUsers.record(['1'])
    await dbApi.pendingCheckUsers.uploaded(['1'])
    expect(await listPendingCheckUsers()).length(0)
  })
  it('should not check if the user is checked in the last 24 hours', async () => {
    vi.useFakeTimers()
    await dbApi.pendingCheckUsers.record(['1'])
    await dbApi.pendingCheckUsers.uploaded(['1'], 24 * 60 * 60)
    expect(await listPendingCheckUsers()).length(0)
    await dbApi.pendingCheckUsers.record(['1'])
    expect(await listPendingCheckUsers()).length(0)
    vi.setSystemTime(dayjs().add(1, 'day').toDate())
    await dbApi.pendingCheckUsers.record(['1'])
    expect(await listPendingCheckUsers()).length(1)
    vi.clearAllTimers()
  })
  it('should not check if the user is reviewed', async () => {
    vi.useFakeTimers()
    await dbApi.pendingCheckUsers.record(['1'])
    await dbApi.pendingCheckUsers.uploaded(['1'])
    expect(await listPendingCheckUsers()).length(0)
    await dbApi.spamUsers.record(['1'])
    vi.setSystemTime(dayjs().add(1, 'day').toDate())
    await dbApi.pendingCheckUsers.record(['1'])
    expect(await listPendingCheckUsers()).length(0)
    vi.clearAllTimers()
  })
  it('should not upload user with undefined followers_count, friends_count, is_blue_verified', async () => {
    await dbApi.users.record([
      {
        id: '1000',
        updated_at: new Date().toISOString(),
        blocking: true,
      } as User,
    ])
    await dbApi.pendingCheckUsers.record(['1000'])
    expect(await listPendingCheckUsers()).length(0)
    await dbApi.pendingCheckUsers.record(['1'])
    expect(await listPendingCheckUsers()).length(1)
  })
  it('should be able to work with thousands of data', async () => {
    await dbApi.users.record(
      range(10000).map((i) => ({
        id: i.toString(),
        updated_at: new Date().toISOString(),
        blocking: true,
        followers_count: 10,
        friends_count: 10,
        is_blue_verified: false,
      })) as User[],
    )
    await dbApi.pendingCheckUsers.record(range(10000).map(String))
    expect(await listPendingCheckUsers()).length(10000)
  })
})

describe('spam user', () => {
  beforeEach(async () => {
    await dbApi.users.record(
      Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        updated_at: new Date().toISOString(),
        blocking: true,
      })) as User[],
    )
  })
  it('should be able to record', async () => {
    await dbApi.spamUsers.record(['1'])
    expect(await dbApi.spamUsers.isSpam(['1', '2'])).toEqual(['1'])
  })
})
