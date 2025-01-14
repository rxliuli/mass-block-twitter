import { sendMessage } from '$lib/messaging'

export default defineBackground(() => {
  browser.contextMenus.create({
    id: 'scan',
    title: 'Scan and Block',
    contexts: ['page'],
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'scan') {
      // await browser.scripting.executeScript({
      //   target: { tabId: tab?.id! },
      //   world: 'MAIN',
      //   files: ['/scan.js'],
      // })
      await sendMessage('show', undefined, tab!.id)
      return
    }
  })
  browser.action.onClicked.addListener(async (tab) => {
    await sendMessage('show', undefined, tab!.id)
  })
})
