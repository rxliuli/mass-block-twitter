export default defineBackground(() => {
  browser.contextMenus.create({
    id: 'scan',
    title: 'Scan and Block',
    contexts: ['page'],
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'import') {
      console.log('import')
      return
    }
    if (info.menuItemId === 'scan') {
      await browser.scripting.executeScript({
        target: { tabId: tab?.id! },
        world: 'MAIN',
        files: ['/scan.js'],
      })
      return
    }
  })
})
