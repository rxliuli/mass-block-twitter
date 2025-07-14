import { describe, expect, it, vi } from 'vitest'
import { AccountSettingsResponse } from '../src/lib'
import { initCloudflareTest } from './utils'
import { localUser } from '../src/db/schema'
import { pick } from 'es-toolkit'
import { JWT_EXPIRE_TIME } from '../src/middlewares/auth'
import { eq } from 'drizzle-orm'

const c = initCloudflareTest()

describe('accounts', () => {
  describe('settings', () => {
    it('get settings should be ok', async () => {
      const resp = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: `Bearer ${c.token1}`,
        },
      })
      expect(resp.ok).true
      const data = (await resp.json()) as AccountSettingsResponse
      const [expected] = await c.db
        .select()
        .from(localUser)
        .where(eq(localUser.id, 'test-user-1'))
      expect<string>(data.createdAt)
      expect<string>(data.updatedAt)
      expect<string>(data.lastLogin)
      expect(data).toEqual(
        JSON.parse(
          JSON.stringify(
            pick(expected!, [
              'id',
              'email',
              'isPro',
              'createdAt',
              'updatedAt',
              'lastLogin',
            ]),
          ),
        ),
      )
    })
    it('get settings for multiple users', async () => {
      const resp1 = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: `Bearer ${c.token1}`,
        },
      })
      expect(resp1.ok).true
      const r1 = (await resp1.json()) as AccountSettingsResponse
      expect(r1.id).toEqual('test-user-1')
      const resp2 = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: `Bearer ${c.token2}`,
        },
      })
      expect(resp2.ok).true
      const r2 = (await resp2.json()) as AccountSettingsResponse
      expect(r2.id).toEqual('test-user-2')
    })
    it('get settings for get new token', async () => {
      async function getSettings() {
        const resp = await fetch('/api/accounts/settings', {
          headers: {
            Authorization: `Bearer ${c.token1}`,
          },
        })
        expect(resp.ok).true
        return (await resp.json()) as AccountSettingsResponse
      }
      vi.useFakeTimers()
      const r1 = await getSettings()
      expect(r1.newToken).undefined
      vi.setSystemTime(new Date(Date.now() + (JWT_EXPIRE_TIME * 1000) / 2))
      const r2 = await getSettings()
      expect(r2.newToken).not.undefined
      expect(r2.newToken).not.toEqual(c.token1)
      vi.useRealTimers()
    })
  })
})
