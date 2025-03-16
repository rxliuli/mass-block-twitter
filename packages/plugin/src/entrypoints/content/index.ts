import { mount, unmount } from 'svelte'
import App from './app.svelte'
import './app.css'
import { onMessage, sendMessage } from '$lib/messaging'
import {
  autoCheckPendingUsers,
  refreshAuthInfo,
  refreshModListSubscribedUsers,
  refreshSpamUsers,
} from '$lib/content'
import { initXTransactionId } from '$lib/api'

export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    initXTransactionId()

    refreshSpamUsers()
    refreshModListSubscribedUsers()
    refreshAuthInfo()
    autoCheckPendingUsers()

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
