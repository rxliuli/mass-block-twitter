import { sendMessage } from '$lib/messaging'

export default defineBackground(() => {
  browser.runtime.setUninstallURL(
    'https://mass-block-twitter.rxliuli.com/feedback',
  )

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

  browser.action.onClicked.addListener(async (tab) => {
    onShow(tab?.id)
  })
})
