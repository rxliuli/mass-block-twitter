import { mount, unmount } from 'svelte'
import App from './app.svelte'
import './app.css'
import {
  autoCheckPendingUsers,
  quickBlock,
  refreshAuthInfo,
  refreshModListSubscribedUsers,
  spamReport,
} from '$lib/content'
import { initXTransactionId } from '$lib/api'
import { getLocaleLanguage, initI18n } from '$lib/i18n'
import { wait } from '@liuli-util/async'
import { eventMessage } from '$lib/shared'
import { initDB } from '$lib/db'
import { toast } from 'svelte-sonner'

export default defineContentScript({
  matches: ['https://x.com/**', 'https://mobile.x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    initXTransactionId()

    await initDB()

    refreshModListSubscribedUsers()
    refreshAuthInfo()
    autoCheckPendingUsers()

    await wait(() => !!document.body)

    initI18n(getLocaleLanguage() ?? 'en-US')
    const openExtensionPath = (
      await browser.storage.local.get<{ openExtensionPath?: string }>(
        'openExtensionPath',
      )
    ).openExtensionPath
    if (openExtensionPath) {
      await browser.storage.local.remove('openExtensionPath')
    }
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
        mount(App, {
          target: shadowDOM,
          props: {
            initialPath: openExtensionPath,
          },
        })
      },
      onRemove: () => {
        unmount(App)
      },
    })
    ui.mount()

    eventMessage.onMessage('SpamReportRequest', (request) =>
      spamReport(request),
    )
    eventMessage.onMessage('QuickBlock', quickBlock)
    eventMessage.onMessage('Toast', (data) =>
      toast[data.type](data.message, data.options),
    )
  },
})
