import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { render, RenderResult } from 'vitest-browser-svelte'
import BatchBlockUserDemo from './BatchBlockUser.demo.svelte'
import { batchBlockUsersMutation } from '../batchBlockUsers'
import { initI18n } from '$lib/i18n'
import { dbApi, User } from '$lib/db'
import { AuthInfo } from '@mass-block-twitter/server'
import { BatchBlockUsersProcessedMeta, ExpectedError } from '$lib/api'
import { range } from 'lodash-es'

describe('batchBlockUsers', () => {
  let screen: RenderResult<BatchBlockUserDemo>
  async function getAuthInfo() {
    return {
      isPro: true,
      token: 'test',
      email: 'test',
      id: 'test',
    } satisfies AuthInfo
  }
  let blockUser: Mock<(user: User) => Promise<void>>
  let onProcessed: Mock<
    (user: User, meta: BatchBlockUsersProcessedMeta) => Promise<void>
  >
  function genUser(id: string) {
    return {
      id,
      name: `test${id}`,
      screen_name: `test${id}`,
      description: `test${id}`,
      profile_image_url: `https://example.com/test${id}.png`,
      blocking: false,
      updated_at: new Date().toISOString(),
    } satisfies User
  }
  beforeEach(async () => {
    screen = render(BatchBlockUserDemo)
    initI18n('en-US')
    await dbApi.clear()
    blockUser = vi.fn()
    onProcessed = vi.fn()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should block users', async () => {
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => [genUser('1')],
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('1/1 users blocked'))
      .toBeInTheDocument()
    expect(await dbApi.users.getAll()).length(1)
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should dynamic add users', async () => {
    const users = [genUser('1'), genUser('2')]
    onProcessed.mockImplementation(async (_user, meta) => {
      if (users.length < 10) {
        users.push(genUser((users.length + 1).toString()))
      }
    })
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('10/10 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(10)
    expect(onProcessed).toHaveBeenCalledTimes(10)
  })
  it('should stop when click stop button', async () => {
    const controller = new AbortController()
    const users = [genUser('1'), genUser('2')]
    onProcessed.mockImplementation(async (user, meta) => {
      if (user.id === '1') {
        const stopBtn = screen.getByText('Stop')
        await expect.element(stopBtn).toBeInTheDocument()
        ;(stopBtn.element() as HTMLButtonElement).click()
      }
    })
    await batchBlockUsersMutation({
      controller,
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('1/2 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should stop when abort controller abort', async () => {
    const controller = new AbortController()
    const users = [genUser('1'), genUser('2')]
    onProcessed.mockImplementation(async (user, meta) => {
      if (user.id === '1') {
        controller.abort()
      }
    })
    await batchBlockUsersMutation({
      controller,
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('1/2 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should stop when some users not found', async () => {
    const users = [genUser('1'), genUser('2')]
    blockUser.mockImplementation(async (user) => {
      if (user.id === '1') {
        throw new ExpectedError('notFound', 'User not found')
      }
    })
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('1/2 users blocked'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('User test1 not found'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(2)
    expect(onProcessed).toHaveBeenCalledTimes(2)
  })
  it('should stop when rate limit exceeded(429)', async () => {
    const users = [genUser('1'), genUser('2')]
    blockUser.mockImplementation(async (user) => {
      if (user.id === '1') {
        throw new ExpectedError('rateLimit', 'Rate limit exceeded')
      }
    })
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('0/2 users blocked'))
      .toBeInTheDocument()
    await expect
      .element(
        screen.getByText(
          'Twitter API rate limit exceeded, please try again later',
        ),
      )
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should stop when rate limit exceeded(401)', async () => {
    const users = [genUser('1'), genUser('2')]
    blockUser.mockImplementation(async (user) => {
      if (user.id === '1') {
        throw new ExpectedError('unauthorized', 'Unauthorized')
      }
    })
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('0/2 users blocked'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Unauthorized, please login again'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should stop when rate limit exceeded(403)', async () => {
    const users = [genUser('1'), genUser('2')]
    blockUser.mockImplementation(async (user) => {
      if (user.id === '1') {
        throw new ExpectedError('forbidden', 'Forbidden')
      }
    })
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed: onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('0/2 users blocked'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Forbidden, please try again later'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
  })
  it('should skip blocked users', async () => {
    await dbApi.users.record([{ ...genUser('1'), blocking: true }])
    const users = [genUser('1'), genUser('2')]
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('1/2 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(2)
  })
  it('should wait 5 minutes when block 150 users', async () => {
    const interval = setInterval(() => {
      vi.runAllTimers()
    }, 100)
    vi.useFakeTimers()
    const users = range(300).map((i) => genUser(i.toString()))
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('300/300 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(300)
    expect(onProcessed).toHaveBeenCalledTimes(300)
    clearInterval(interval)
    vi.useRealTimers()
  })
  it('should ask to continue when blocking 450 users(Stop button)', async () => {
    const interval = setInterval(() => {
      vi.runAllTimers()
    }, 100)
    vi.useFakeTimers()
    onProcessed.mockImplementation(async (_user, meta) => {
      if (meta.index === 450) {
        setTimeout(async () => {
          const stopBtn = screen
            .getByText('Stop')
            .element() as HTMLButtonElement
          expect(stopBtn).not.undefined
          stopBtn.click()
        }, 1000)
      }
    })
    const users = range(500).map((i) => genUser(i.toString()))
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('450/500 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(450)
    expect(onProcessed).toHaveBeenCalledTimes(450)
    clearInterval(interval)
    vi.useRealTimers()
  })
  it('should ask to continue when blocking 450 users(Continue button)', async () => {
    const interval = setInterval(() => {
      vi.runAllTimers()
    }, 100)
    vi.useFakeTimers()
    onProcessed.mockImplementation(async (_user, meta) => {
      if (meta.index === 450) {
        setTimeout(async () => {
          const continueBtn = screen
            .getByText('Continue', { exact: true })
            .element() as HTMLButtonElement
          expect(continueBtn).not.undefined
          continueBtn.click()
        }, 1000)
      }
    })
    const users = range(500).map((i) => genUser(i.toString()))
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed,
      getAuthInfo,
    })
    await expect
      .element(screen.getByText('500/500 users blocked'))
      .toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(500)
    expect(onProcessed).toHaveBeenCalledTimes(500)
    clearInterval(interval)
    vi.useRealTimers()
  })
  it('should stop when non-pro user block 150 users', async () => {
    const users = range(500).map((i) => genUser(i.toString()))
    await batchBlockUsersMutation({
      controller: new AbortController(),
      users: () => users,
      blockUser,
      onProcessed,
      getAuthInfo: async () => ({
        ...getAuthInfo(),
        isPro: false,
      }),
    })
    await expect
      .element(screen.getByText('150/500 users blocked'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Upgrade Now')).toBeInTheDocument()
    expect(blockUser).toHaveBeenCalledTimes(150)
    expect(onProcessed).toHaveBeenCalledTimes(150)
  })
})
