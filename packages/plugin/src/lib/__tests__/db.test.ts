// @vitest-environment happy-dom
import { Activity, dbApi, dbStore, initDB, MyDB } from '$lib/db'
import 'fake-indexeddb/auto'
import { ulid } from 'ulidx'
import { beforeEach, describe, expect, it } from 'vitest'

describe('db', () => {
  beforeEach(async () => {
    await initDB()
  })
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
    const r3 = await dbApi.activitys.getByPage({ limit: 10, cursor: r2.cursor })
    expect(r3.data.length).toBe(9)
    expect(r3.cursor).undefined
  })
})
