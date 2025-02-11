export default defineContentScript({
  matches: ['https://mass-block-twitter.rxliuli.com/*', 'http://localhost/*'],
  main: () => {
    document.addEventListener('LoginSuccess', async (event) => {
      const authInfo = (event as CustomEvent).detail
      await browser.storage.local.set({ authInfo })
    })
  },
})
