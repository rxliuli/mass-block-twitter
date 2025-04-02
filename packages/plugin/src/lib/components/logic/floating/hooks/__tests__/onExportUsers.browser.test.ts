import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import {
  extractScreenName,
  maxRequestsHandler,
  sleepHandler,
} from '../onExportUsers'
import { range } from 'es-toolkit'
import { render } from 'vitest-browser-svelte'
import { PageTest } from '$lib/components/test'
import { wait } from '@liuli-util/async'
import { tick } from 'svelte'

describe('sleepHandler', () => {
  let next: Mock
  let controller: AbortController
  let context: {
    controller: AbortController
    items: any[]
    progress: {
      total?: number
    }
  }
  beforeEach(() => {
    next = vi.fn()
    controller = new AbortController()
    context = {
      controller,
      items: [],
      progress: {
        total: 100,
      },
    }
  })
  afterEach(() => {
    vi.clearAllMocks()
    controller.abort()
  })
  it('fixed time', async () => {
    const sleep = sleepHandler({ time: 100 })
    const start = Date.now()
    await sleep({ context }, next)
    expect(next).toBeCalled()
    expect(Date.now() - start).gte(100)
  })
  it('random time', async () => {
    const sleep = sleepHandler({ time: () => 100 + Math.random() * 100 })
    const start = Date.now()
    const r = await Promise.all(
      range(100).map(async (it) => {
        await sleep({ context }, next)
        return Date.now() - start
      }),
    )
    expect(next).toBeCalled()
    expect(r.every((it) => it >= 100 && it <= 200)).true
  })
  it('abort', async () => {
    const sleep = sleepHandler({ time: 100 })
    const start = Date.now()
    const p = sleep({ context }, next)
    controller.abort()
    await p
    expect(next).not.toBeCalled()
  })
})

describe('maxRequestsHandler', () => {
  let next: Mock
  let controller: AbortController
  beforeEach(() => {
    next = vi.fn()
    controller = new AbortController()
  })
  afterEach(() => {
    vi.clearAllMocks()
    controller.abort()
  })
  it('should show continue button', async () => {
    const screen = render(PageTest)
    const maxRequests = maxRequestsHandler({ title: 'test', maxRequests: 3 })
    await maxRequests(
      {
        context: {
          controller,
          index: 0,
          items: [],
          progress: {
            averageTime: 0,
            currentTime: 0,
            processed: 1,
            remainingTime: 0,
            startTime: 0,
            successful: 0,
            failed: 0,
            total: 100,
          },
        },
        toastId: 'test',
      },
      next,
    )
    const continueBtn = screen.getByText('Continue', { exact: true })
    await expect.element(continueBtn).not.toBeInTheDocument()
    await Promise.race([
      maxRequests(
        {
          context: {
            controller,
            index: 2,
            items: [],
            progress: {
              averageTime: 0,
              currentTime: 0,
              processed: 3,
              remainingTime: 0,
              startTime: 0,
              successful: 0,
              failed: 0,
              total: 100,
            },
          },
          toastId: 'test',
        },
        next,
      ),
      wait(1000),
    ])
    await expect.element(continueBtn).toBeInTheDocument()
    await continueBtn.click()
    await wait(1000)
    expect(next).toBeCalled()
  })
  it('should show stop button', async () => {
    const screen = render(PageTest)
    const maxRequests = maxRequestsHandler({ title: 'test', maxRequests: 3 })
    const stopBtn = screen.getByText('Stop', { exact: true })
    await expect.element(stopBtn).not.toBeInTheDocument()
    await Promise.race([
      maxRequests(
        {
          context: {
            controller,
            index: 2,
            items: [],
            progress: {
              averageTime: 0,
              currentTime: 0,
              processed: 3,
              remainingTime: 0,
              startTime: 0,
              successful: 0,
              failed: 0,
              total: 100,
            },
          },
          toastId: 'test',
        },
        next,
      ),
      wait(1000),
    ])
    await expect.element(stopBtn).toBeInTheDocument()
    await stopBtn.click()
    await wait(1000)
    expect(next).not.toBeCalled()
  })
})

describe('extractScreenName', () => {
  it('should extract screen name', () => {
    expect(
      extractScreenName('https://x.com/realDonaldTrump/verified_followers'),
    ).toBe('realDonaldTrump')
    expect(extractScreenName('https://x.com/realDonaldTrump/followers')).toBe(
      'realDonaldTrump',
    )
    expect(extractScreenName('https://x.com/realDonaldTrump/following')).toBe(
      'realDonaldTrump',
    )
  })
})
