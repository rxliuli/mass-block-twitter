export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  async main() {
    await injectScript('/inject.js')
  },
})
