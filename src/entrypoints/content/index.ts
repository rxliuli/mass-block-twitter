import { mount, unmount } from 'svelte'
import { wait } from '@liuli-util/async'
import App from './app.svelte'
import './app.css'

export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await injectScript('/inject.js')

    await wait(() => !!document.body)
    const ui = await createShadowRootUi(ctx, {
      name: 'mass-block-twitter',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        mount(App, {
          target: container,
        })
      },
      onRemove: (app) => {
        unmount(App)
      },
    })

    // 4. Mount the UI
    ui.mount()
  },
})
