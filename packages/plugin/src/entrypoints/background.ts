import { sendMessage } from '$lib/messaging'

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
})
