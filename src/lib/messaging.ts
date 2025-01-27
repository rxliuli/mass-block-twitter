import { defineExtensionMessaging } from '@webext-core/messaging'
import type { spamReportRequestSchema } from '@mass-block-twitter/server'

interface ProtocolMap {
  show(): void

  fetchSpamUsers(): Record<string, number>
  spamReport(request: typeof spamReportRequestSchema._type): void
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>()
