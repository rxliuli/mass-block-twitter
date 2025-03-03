import { defineExtensionMessaging } from '@webext-core/messaging'
import type {
  ModListSubscribedUserAndRulesResponse,
  TwitterSpamReportRequest,
} from '@mass-block-twitter/server'

interface ProtocolMap {
  show(): void

  fetchSpamUsers(): Record<string, number>
  spamReport(request: TwitterSpamReportRequest): void
  fetchModListSubscribedUsers(force?: boolean): ModListSubscribedUserAndRulesResponse
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>()
