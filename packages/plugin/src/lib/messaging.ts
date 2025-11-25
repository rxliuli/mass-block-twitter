import { defineExtensionMessaging } from '@webext-core/messaging'

interface ProtocolMap {
  show(): void

  fetch(req: string): Promise<string>
}

export const messager =
  defineExtensionMessaging<ProtocolMap>()
