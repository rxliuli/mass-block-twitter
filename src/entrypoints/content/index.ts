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
        const shadowDOM = document
          .querySelector('mass-block-twitter')
          ?.shadowRoot?.querySelector('body')
        if (!shadowDOM) {
          throw new Error('mass-block-twitter not found')
        }
        mount(App, { target: shadowDOM })
      },
      onRemove: (app) => {
        unmount(App)
      },
    })

    // 4. Mount the UI
    ui.mount()
  },
})
