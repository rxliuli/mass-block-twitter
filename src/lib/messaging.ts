import { defineExtensionMessaging } from '@webext-core/messaging'

interface ProtocolMap {
  show(): void
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>()
