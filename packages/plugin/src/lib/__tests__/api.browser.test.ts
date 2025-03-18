import { batchBlockUsers, ExpectedError } from '$lib/api'
import { User } from '$lib/db'
import { wait } from '@liuli-util/async'
import { describe, expect, it, vi } from 'vitest'

describe('batchBlockUsers', () => {
  const getUsers = (i: string): User => ({
    id: i,
    name: `name-${i}`,
    screen_name: `screen_name-${i}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    blocking: false,
  })
  it('should block users', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(async () => {
      await wait(100)
    })
    await batchBlockUsers([getUsers('1'), getUsers('2')], {
      blockUser: fn,
      onProcessed: async (user) => {},
      signal: controller.signal,
    })
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('should abort', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(async () => {
      await wait(100)
    })
    await batchBlockUsers([getUsers('1'), getUsers('2')], {
      blockUser: fn,
      onProcessed: async (user) => {
        if (user.id === '1') {
          controller.abort()
        }
      },
      signal: controller.signal,
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('should support dynamic users', async () => {
    const controller = new AbortController()
    const fn = vi.fn()
    const users = [getUsers('1'), getUsers('2')]
    await batchBlockUsers(users, {
      blockUser: fn,
      onProcessed: async () => {
        if (users.length < 10) {
          users.push(getUsers(`${users.length + 1}`))
        }
      },
      signal: controller.signal,
    })
    expect(fn).toHaveBeenCalledTimes(10)
  })
  it('should support dynamic users for function', async () => {
    const controller = new AbortController()
    const fn = vi.fn()
    let users = [getUsers('1'), getUsers('2')]
    await batchBlockUsers(() => users, {
      blockUser: fn,
      onProcessed: async () => {
        if (users.length < 10) {
          users = [...users, getUsers(`${users.length + 1}`)]
        }
      },
      signal: controller.signal,
    })
    expect(fn).toHaveBeenCalledTimes(10)
  })
  it('should handle rateLimit', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(async (user: User) => {
      if (user.id === '1') {
        throw new ExpectedError('rateLimit', 'Rate limit exceeded')
      }
      await wait(100)
    })
    let error: unknown
    await batchBlockUsers([getUsers('1'), getUsers('2')], {
      blockUser: fn,
      signal: controller.signal,
      onProcessed: async (user, meta) => {
        if (meta.error && meta.error instanceof ExpectedError) {
          error = meta.error
          controller.abort()
        }
      },
    })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(ExpectedError)
  })
  it('should skip blocked users', async () => {
    const controller = new AbortController()
    const fn = vi.fn().mockImplementation(async (user: User) => {
      if (user.id === '1') {
        return 'skip'
      }
      await wait(100)
    })
    const metas: {
      index: number
      total: number
      time: number
      wait: number
    }[] = []
    await batchBlockUsers([getUsers('1'), getUsers('2'), getUsers('3')], {
      blockUser: fn,
      signal: controller.signal,
      onProcessed: async (user, meta) => {
        metas.push(meta)
      },
    })
    expect(fn).toHaveBeenCalledTimes(3)
    expect(metas[0].wait).toBe(0)
    expect(metas[1].wait).gte(100)
    expect(metas[2].wait).gte(0)
  })
})
