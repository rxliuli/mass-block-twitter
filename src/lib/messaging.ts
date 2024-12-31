import { defineExtensionMessaging } from '@webext-core/messaging'

interface ProtocolMap {
  show(): void
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>()
