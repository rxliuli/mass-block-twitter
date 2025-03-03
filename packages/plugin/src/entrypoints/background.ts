import { SERVER_URL } from '$lib/constants'
import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
import { onMessage, sendMessage } from '$lib/messaging'
import {
  AuthInfo,
  ModListSubscribedUserAndRulesResponse,
} from '@mass-block-twitter/server'

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'scan',
      title: 'Scan and Block',
      contexts: ['page'],
    })
  })

  async function onShow(tabId?: number) {
    if (!tabId) {
      return
    }
    if (import.meta.env.FIREFOX) {
      const res = await browser.permissions.contains({
        permissions: ['declarativeNetRequest'],
      })
      if (!res) {
        await browser.permissions.request({
          permissions: ['declarativeNetRequest'],
        })
        return
      }
    }
    await sendMessage('show', undefined, tabId)
  }

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'scan') {
      onShow(tab?.id)
      return
    }
  })
  browser.action.onClicked.addListener(async (tab) => {
    onShow(tab?.id)
  })
  onMessage('fetchSpamUsers', async () =>
    fetch(`${SERVER_URL}/api/twitter/spam-users-for-type`).then((res) =>
      res.json(),
    ),
  )
  onMessage('spamReport', async (ev) => {
    // console.log('spamReport background script', ev.data)
    const resp = await fetch(`${SERVER_URL}/api/twitter/spam-users`, {
      method: 'POST',
      body: JSON.stringify(ev.data),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!resp.ok) {
      throw new Error('Failed to report spam' + resp.statusText)
    }
  })
  type JsonError = {
    code: number
    message: string
  }
  onMessage('fetchModListSubscribedUsers', async (ev) => {
    const token = (
      await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo')
    ).authInfo?.token
    if (!token) {
      throw {
        code: 401,
        message: 'Unauthorized',
      } as JsonError
    }
    const resp = await fetch(
      `${SERVER_URL}/api/modlists/subscribed/users?version=` +
        browser.runtime.getManifest().version,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      },
    )
    if (!resp.ok) {
      if (resp.status === 401) {
        throw {
          code: 401,
          message: 'Unauthorized',
        } as JsonError
      }
      throw {
        code: resp.status,
        message: 'Failed to fetch mod list subscribed users',
      } as JsonError
    }
    return (await resp.json()) as ModListSubscribedUserAndRulesResponse
  })
})
