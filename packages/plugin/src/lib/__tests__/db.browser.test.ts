import { Activity, dbApi, dbStore, initDB, MyDB, User } from '$lib/db'
import { ulid } from 'ulidx'
import { beforeEach, describe, expect, it } from 'vitest'

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
})
