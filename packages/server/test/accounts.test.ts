import { describe, expect, it } from 'vitest'
import { AccountSettingsResponse } from '../src/lib'
import { initCloudflareTest } from './utils'
import { localUser } from '../src/db/schema'
import { pick } from 'es-toolkit'

const context = initCloudflareTest()

describe('accounts', () => {
  describe('settings', () => {
    it('get settings should be ok', async () => {
      const resp = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: `Bearer ${context.token1}`,
        },
      })
      expect(resp.ok).true
      const data = (await resp.json()) as AccountSettingsResponse
      const expected = await context.db
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
  })
})
