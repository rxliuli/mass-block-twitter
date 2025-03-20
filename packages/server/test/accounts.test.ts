import { describe, expect, it } from 'vitest'
import { AccountSettingsResponse } from '../src/lib'
import { initCloudflareTest } from './utils'
import { localUser } from '../src/db/schema'
import { pick } from 'es-toolkit'

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
      const expected = await c.db
        .select()
        .from(localUser)
        .get({ id: 'test-user-1' })
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
  })
})
