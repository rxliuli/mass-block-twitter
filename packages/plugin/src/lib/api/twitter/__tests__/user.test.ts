import { describe, expect, it } from 'vitest'
import { parseBlockedUsers } from '../user'
import BlockedAccountsAll1 from './assets/BlockedAccountsAll1.json'
import BlockedAccountsAll2 from './assets/BlockedAccountsAll2.json'
import { omit } from 'es-toolkit'

describe('getBlockedUsers', () => {
  describe('parseBlockedUsers', () => {
    it('parseBlockedUsers page1', async () => {
      const users = parseBlockedUsers(BlockedAccountsAll1)
      expect(users.data).length(18)
      expect(users.cursor).not.undefined
      expect(users.cursor).toMatchSnapshot()
      expect(users.data.map((it) => omit(it, ['updated_at']))).toMatchSnapshot()
    })
    it('parseBlockedUsers page2', async () => {
      const users = parseBlockedUsers(BlockedAccountsAll2)
      expect(users.data).length(17)
      expect(users.cursor).not.undefined
      expect(users.cursor).toMatchSnapshot()
      expect(users.data.map((it) => omit(it, ['updated_at']))).toMatchSnapshot()
    })
  })
})
