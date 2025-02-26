import { mount, unmount } from 'svelte'
import { wait } from '@liuli-util/async'
import App from './app.svelte'
import './app.css'
import { onMessage, sendMessage } from '$lib/messaging'
import {
  refreshAuthInfo,
  refreshModListSubscribedUsers,
  refreshSpamUsers,
} from '$lib/content'
import { PublicPath } from 'wxt/browser'

export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    refreshSpamUsers()
    refreshModListSubscribedUsers()
    refreshAuthInfo()

    const removeListener = onMessage('show', async () => {
      const ui = await createShadowRootUi(ctx, {
        name: 'mass-block-twitter',
        position: 'inline',
        anchor: 'body',
        onMount: () => {
          const shadowDOM = document
            .querySelector('mass-block-twitter')
            ?.shadowRoot?.querySelector('body')
          if (!shadowDOM) {
            throw new Error('mass-block-twitter not found')
          }
          mount(App, { target: shadowDOM })
        },
        onRemove: () => {
          unmount(App)
        },
      })
      ui.mount()
      removeListener()
    })

    window.addEventListener('SpamReportRequest', (event) => {
      const request = (event as CustomEvent).detail
      // console.log('spamReport isolation content script', request)
      sendMessage('spamReport', request)
    })
  },
})
