import { User } from '$lib/db'
import { range } from 'es-toolkit'
import { initI18n } from '$lib/i18n'
import { useController } from '$lib/stores/controller'
import { parseCSV } from '$lib/util/csv'
import { commands } from '@vitest/browser/context'
import { describe, it, beforeEach, expect, afterEach } from 'vitest'
import { render, RenderResult } from 'vitest-browser-svelte'
import { batchExportBlockedUsers } from '../batchExportBlockedUsers'
import { PageTest } from '$lib/components/test'
import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'

describe('batchExportBlockedUsers', () => {
  function genUser(it: number) {
    return {
      id: it.toString(),
      screen_name: `screen_name-${it}`,
      name: `name-${it}`,
      description: '',
      profile_image_url: '',
    } as User
  }
  const data = range(1000).map(genUser)
  beforeEach(() => {
    initI18n('en-US')
    localStorage.clear()
  })
  async function download(screen: RenderResult<any>) {
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByText('Download').click(),
    ])
    const r = parseCSV(download.text)
    return r as User[]
  }

  it('should export blocked users to CSV', async () => {
    const screen = render(PageTest)
    let index = 0
    await batchExportBlockedUsers({
      controller: useController(),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
      },
    })
    const r = await download(screen)
    expect(r).toEqual(data)
  })
  it('should export blocked users to CSV with pro user', async () => {
    const authInfo = useAuthInfo()
    authInfo.value = {
      email: 'test@test.com',
      id: '1',
      isPro: true,
      token: '123',
    }
    const data = range(2000).map(genUser)
    const screen = render(PageTest)
    let index = 0
    await batchExportBlockedUsers({
      controller: new AbortController(),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
      },
    })
    const r = await download(screen)
    expect(r).toEqual(data)
    await expect
      .element(screen.getByText('Upgrade Now'))
      .not.toBeInTheDocument()
  })
  it('should export blocked users to CSV with not pro user and gt 1500 users', async () => {
    const authInfo = useAuthInfo()
    authInfo.value = {
      email: 'test2@test.com',
      id: '2',
      isPro: false,
      token: '2',
    }
    const data = range(2000).map(genUser)
    const screen = render(PageTest)
    let index = 0
    await batchExportBlockedUsers({
      controller: new AbortController(),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
      },
    })
    const r = await download(screen)
    expect(r).toEqual(data.slice(0, 1500))
    await expect
      .element(
        screen.getByText(
          'You need upgrade to pro to export more than 1500 users',
        ),
      )
      .toBeInTheDocument()
    await expect.element(screen.getByText('Upgrade Now')).toBeInTheDocument()
  })
  it('should export blocked users to CSV show confirm dialog with gt 850 requests(continue)', async () => {
    const authInfo = useAuthInfo()
    authInfo.value = {
      email: 'test1@test.com',
      id: '1',
      isPro: true,
      token: '1',
    }
    const data = range(20000).map(genUser)
    const screen = render(PageTest)
    let index = 0
    batchExportBlockedUsers({
      controller: new AbortController(),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
      },
    })
    const continueBtn = screen.getByText('Continue', { exact: true })
    await expect.element(continueBtn).toBeInTheDocument()
    await continueBtn.click()
    const r = await download(screen)
    expect(r).toEqual(data)
  })
  it('should export blocked users to CSV show confirm dialog with gt 850 requests(stop)', async () => {
    const authInfo = useAuthInfo()
    authInfo.value = {
      email: 'test@test.com',
      id: '1',
      isPro: true,
      token: '123',
    }
    const data = range(20000).map(genUser)
    const screen = render(PageTest)
    let index = 0
    batchExportBlockedUsers({
      controller: new AbortController(),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
      },
    })
    const stopBtn = screen.getByText('Stop', { exact: true })
    await expect.element(stopBtn).toBeInTheDocument()
    await stopBtn.click()
    const r = await download(screen)
    expect(r).toEqual(data.slice(0, 20 * 850))
  })
})
