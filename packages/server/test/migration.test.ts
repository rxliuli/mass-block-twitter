import { assert, describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { ModListCreateRequest } from '../src/lib'
import { range } from 'es-toolkit'
import { modList, user } from '../src/db/schema'
import { ulid } from 'ulidx'

const c = initCloudflareTest()

describe('migration', () => {
  const newModList = {
    name: 'test',
    description: 'test',
    twitterUser: {
      id: '123',
      screen_name: 'test',
      name: 'test',
      created_at: new Date().toISOString(),
      is_blue_verified: false,
      followers_count: 100,
      friends_count: 100,
      default_profile: false,
      default_profile_image: false,
    },
  } satisfies ModListCreateRequest
  it('should migrate modlist avatar', async () => {
    await c.db.insert(user).values({
      id: '123',
      screenName: 'test',
      name: 'test',
      createdAt: new Date().toISOString(),
    })
    const data = range(10).map((it) => ({
      id: ulid(),
      localUserId: 'test-user-1',
      name: `test-${it}`,
      description: `test-${it}`,
      twitterUserId: '123',
      avatar: `data:image/png;base64,${Buffer.from(
        Math.random().toString(),
      ).toString('base64')}`,
    }))
    await c.db.batch(data.map((it) => c.db.insert(modList).values(it)) as any)
    async function migrate() {
      const resp = await fetch('/api/migration/modlist/update-avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.ADMIN_TOKEN}`,
        },
      })
      expect(resp.ok).true
      assert(resp.body)
      const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader()
      const r: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done || !value) {
          break
        }
        r.push(value)
      }
      return r
    }
    const r1 = await migrate()
    expect(r1).toEqual(data.map((it) => it.id))
    const r2 = await migrate()
    expect(r2).empty
  })
})
