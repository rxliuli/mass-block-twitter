export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  async main() {
    await injectScript('/inject.js')
  },
})
