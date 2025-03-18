export default defineContentScript({
  matches: ['https://mass-block-twitter.rxliuli.com/*', 'http://localhost/*'],
  main: () => {
    const meta = document.createElement('meta')
    meta.name = 'mass-block-twitter'
    document.head.appendChild(meta)

    document.addEventListener('LoginSuccess', async (event) => {
      const authInfo = (event as CustomEvent).detail
      await browser.storage.local.set({ authInfo })
    })
    document.addEventListener('OpenExtensionPath', async (event) => {
      const path = (event as CustomEvent).detail
      await browser.storage.local.set({
        openExtensionPath: path,
      })
    })
  },
})
