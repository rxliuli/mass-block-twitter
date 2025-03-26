import { PageTest } from '$lib/components/test'
import { initI18n } from '$lib/i18n'
import { omit, range } from 'lodash-es'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, RenderResult } from 'vitest-browser-svelte'
import { CommunityMember } from '$lib/api/twitter'
import ExportCommunityMembersToCSVTest from './exportCommunityMembersToCSV.test.svelte'
import { tick } from 'svelte'
import { page, commands, server } from '@vitest/browser/context'
import { toast } from 'svelte-sonner'
import { wait } from '@liuli-util/async'
import { parseCSV } from '$lib/util/csv'
import { User } from '$lib/db'

describe('exportCommunityMembersToCSV', () => {
  function genUser(it: number) {
    return {
      id: it.toString(),
      screen_name: `screen_name-${it}`,
      name: `name-${it}`,
      description: '',
      profile_image_url: '',
      community_role: 'Member',
    } as CommunityMember
  }
  const data = range(1000).map(genUser)
  beforeEach(() => {
    initI18n('en-US')
  })
  async function download(screen: RenderResult<any>) {
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByText('Download').click(),
    ])
    const r = parseCSV(download.text, {
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    return r
  }
  it('should export community members to CSV', async () => {
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller: new AbortController(),
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    // https://github.com/microsoft/playwright/issues/16402
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByText('Download').click(),
    ])
    expect(download.suggestedFilename.startsWith('community_123_')).true
    const r = parseCSV<User>(download.text, {
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    expect(r).toEqual(data.map((it) => omit(it, 'community_role')))
  })
  it('should export community members to CSV with click stop button', async () => {
    let i = 0
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller: new AbortController(),
          onFetchNextPage: async () => {
            if (i === 10) {
              await screen.getByText('Stop').click()
              return
            }
            i++
          },
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByText('Download').click(),
    ])
    const r = parseCSV(download.text, {
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    expect(r).length(220)
  })
  it('should export community members to CSV with external abort', async () => {
    let i = 0
    const controller = new AbortController()
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller,
          onFetchNextPage: async () => {
            i++
            if (i === 10) {
              controller.abort()
              return
            }
          },
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByText('Download').click(),
    ])
    const r = parseCSV(download.text, {
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    expect(r).length(200)
  })
  it('should export community members to CSV with gt 850 requests(continue)', async () => {
    let i = 0
    const data = range(20000).map(genUser)
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller: new AbortController(),
          onFetchNextPage: async () => {
            i++
          },
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    await expect
      .element(
        screen.getByText(
          'You have fetched 850 requests, do you want to continue?',
        ),
      )
      .toBeInTheDocument()
    await screen.getByText('Continue', { exact: true }).click()
    const r = await download(screen)
    expect(r).length(20000)
  })
  it('should export community members to CSV with gt 850 requests(stop)', async () => {
    let i = 0
    const data = range(20000).map(genUser)
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller: new AbortController(),
          onFetchNextPage: async () => {
            i++
          },
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    await expect
      .element(
        screen.getByText(
          'You have fetched 850 requests, do you want to continue?',
        ),
      )
      .toBeInTheDocument()
    await screen.getByText('Stop', { exact: true }).click()
    const r = await download(screen)
    expect(r).length(20 * 850)
  })
  it('should export community members to CSV with api throw error', async () => {
    let i = 0
    const data = range(20000).map(genUser)
    const screen = render(PageTest, {
      props: {
        component: ExportCommunityMembersToCSVTest,
        props: {
          communityId: '123',
          data: data,
          controller: new AbortController(),
          onFetchNextPage: async () => {
            i++
            if (i === 10) {
              throw new Error('test')
            }
          },
        },
      },
    })
    await screen.getByText('Export', { exact: true }).click()
    await expect
      .element(screen.getByText('Export failed, test'))
      .toBeInTheDocument()
  })
})
