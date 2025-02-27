import { defineExtensionMessaging } from '@webext-core/messaging'
import type {
  ModListSubscribedUserResponse,
  TwitterSpamReportRequest,
} from '@mass-block-twitter/server'

interface ProtocolMap {
  show(): void

  fetchSpamUsers(): Record<string, number>
  spamReport(request: TwitterSpamReportRequest): void
  fetchModListSubscribedUsers(force?: boolean): ModListSubscribedUserResponse
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>()
