import { messager } from '$lib/messaging'
import { parse, stringifyAsync } from '$lib/serializer'

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
    await messager.sendMessage('show', undefined, tabId)
  }

  messager.onMessage('fetch', async (ev) => {
    const req = parse(ev.data) as Parameters<typeof fetch>
    // console.log('Background fetch request', req)
    const r = await stringifyAsync(await fetch(...req))
    // console.log('Background fetch response', r)
    return r
  })

  browser.action.onClicked.addListener(async (tab) => {
    onShow(tab?.id)
  })
})
