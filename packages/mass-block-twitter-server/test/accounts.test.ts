import { describe, expect, it, vi } from 'vitest'
import { AccountSettingsError, AccountSettingsResponse } from '../src/lib'
import { initCloudflareTest } from './utils'

initCloudflareTest()

describe('accounts', () => {
  describe('settings', () => {
    it('get settings should be ok', async () => {
      const resp = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: 'test-token-1',
        },
      })
      expect(resp.ok).true
      const data = (await resp.json()) as AccountSettingsResponse
      expect(data.id).toBe('test-user-1')
    })
    it('get settings should be error when user not found', async () => {
      const resp = await fetch('/api/accounts/settings', {
        headers: {
          Authorization: 'test',
        },
      })
      expect(resp.status).toBe(401)
    })
  })
})
