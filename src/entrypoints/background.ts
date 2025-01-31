import { SERVER_URL } from '$lib/constants'
import { onMessage, sendMessage } from '$lib/messaging'

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'scan',
      title: 'Scan and Block',
      contexts: ['page'],
    })
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'scan') {
      await sendMessage('show', undefined, tab!.id)
      return
    }
  })
  browser.action.onClicked.addListener(async (tab) => {
    await sendMessage('show', undefined, tab!.id)
  })
  onMessage('fetchSpamUsers', async () =>
    fetch(`${SERVER_URL}/spam-users-for-type`).then((res) => res.json()),
  )
  onMessage('spamReport', async (ev) => {
    // console.log('spamReport background script', ev.data)
    const resp = await fetch(`${SERVER_URL}/spam-users`, {
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
})
