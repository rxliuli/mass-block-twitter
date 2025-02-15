import { defineExtensionMessaging } from '@webext-core/messaging'
import type { TwitterSpamReportRequest } from '@mass-block-twitter/server'

interface ProtocolMap {
  show(): void

  fetchSpamUsers(): Record<string, number>
  spamReport(request: TwitterSpamReportRequest): void
  fetchModListSubscribedUsers(force?: boolean): Record<string, string>
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>()
