import { describe, expect, it } from 'vitest'
import { AccountSettingsResponse } from '../src/lib'
import { initCloudflareTest } from './utils'

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
      expect(data.id).toBe('test-user-1')
    })
  })
})
