import { PageTest } from '$lib/components/test'
import { quickBlock } from '$lib/content'
import { render, RenderResult } from 'vitest-browser-svelte'
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import TwitterTimeline from './TwitterTimeline.test.svelte'
import dayjs from 'dayjs'
import { dbApi, Tweet, User } from '$lib/db'
import { tick } from 'svelte'
import { page } from '@vitest/browser/context'
import { getTweetElement } from '$lib/observe'

describe('content', () => {
  let screen: RenderResult<any>

  let f: Mock
  let options: {
    user: User
    tweet: Tweet
    blockUser: (user: User) => Promise<void>
  }
  beforeEach(async () => {
    f = vi.fn()
    options = {
      user: {
        id: '123',
        name: 'test',
        screen_name: 'test',
        profile_image_url: 'https://example.com/image.png',
        blocking: false,
        updated_at: '2021-01-01',
      },
      tweet: {
        id: '123',
        text: 'test',
        user_id: '123',
        conversation_id_str: '123',
        created_at: '2021-01-01',
        updated_at: '2021-01-01',
        lang: 'en',
      },
      blockUser: f,
    }
    screen = render(PageTest, {
      props: {
        component: TwitterTimeline,
        props: {
          tweets: [
            {
              id: '123',
              text: 'test',
              user_screen_name: 'test',
            },
          ],
        },
      },
    })
    await dbApi.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })
  it('should auto block user in timeout', async () => {
    quickBlock(options)
    const userBlocked = screen.getByText('User blocked')
    const undo = screen.getByText('Undo')
    await expect.element(userBlocked).toBeInTheDocument()
    await expect.element(undo).toBeInTheDocument()
    vi.runAllTimers()
    await expect.element(userBlocked).not.toBeInTheDocument()
    await expect.element(undo).not.toBeInTheDocument()
    expect(getTweetElement(options.tweet.id)?.style.display).eq('none')
    expect(f).toHaveBeenCalled()
  })
  it('should not block if undo button is clicked', async () => {
    quickBlock(options)
    const undo = screen.getByText('Undo', { exact: true })
    await expect.element(undo).toBeInTheDocument()
    undo.element().click()
    await tick()
    await expect.element(screen.getByText('Block undone.')).toBeInTheDocument()
    await expect.element(undo).not.toBeInTheDocument()
    expect(f).not.toHaveBeenCalled()
    expect(getTweetElement(options.tweet.id)?.style.display).eq('block')
  })
  it('should block if close button is clicked', async () => {
    quickBlock(options)
    const userBlocked = screen.getByText('User blocked')
    const close = screen.getByLabelText('Close toast')
    await expect.element(userBlocked).toBeInTheDocument()
    close.element().click()
    await tick()
    vi.runAllTimers()
    await expect.element(userBlocked).not.toBeInTheDocument()
    expect(f).toHaveBeenCalled()
  })
})
