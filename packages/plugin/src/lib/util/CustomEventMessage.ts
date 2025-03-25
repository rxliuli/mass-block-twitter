import { ulid } from 'ulidx'

interface CustomEventMessageRequest {
  method: string
  data?: any
  callbackId: string
}

interface CustomEventMessageResponse {
  callbackId: string
  data?: any
  error?: any
}

interface CustomEventMessageRemote<
  T extends Record<string, (data: any) => any>,
> {
  sendMessage: <K extends keyof T & string>(
    method: K,
    data: Parameters<T[K]>[0],
  ) => Promise<ReturnType<T[K]>>
  onMessage: <K extends keyof T & string>(
    method: K,
    callback: (message: Parameters<T[K]>[0]) => void,
  ) => void
  removeMessage: <K extends keyof T & string>(method: K) => void
  removeAllListeners: () => void
}

export function defineCustomEventMessage<
  T extends Record<string, (data: any) => any>,
>(): CustomEventMessageRemote<T> {
  const onMessageMap = new Map<string, (message: any) => any>()
  const callbackMap = new Map<
    string,
    (message: CustomEventMessageResponse) => void
  >()
  async function listenerCustomEvent(event: Event) {
    const detail = (event as CustomEvent).detail as
      | CustomEventMessageRequest
      | CustomEventMessageResponse
    if (!('method' in detail)) {
      callbackMap.get(detail.callbackId)?.(detail)
      return
    }
    let response: CustomEventMessageResponse
    if (onMessageMap.has(detail.method)) {
      try {
        const r = await onMessageMap.get(detail.method)?.(detail.data)
        response = {
          callbackId: detail.callbackId,
          data: r,
        }
      } catch (error) {
        response = {
          callbackId: detail.callbackId,
          error,
        }
      }
    } else {
      response = {
        callbackId: detail.callbackId,
        error: new Error(`method ${detail.method} not found`),
      }
    }
    window.dispatchEvent(
      new CustomEvent('CustomEventMessage', {
        detail: response,
      }),
    )
  }

  let isInitMessage = false
  async function initListener() {
    if (isInitMessage) {
      return
    }
    isInitMessage = true
    window.addEventListener('CustomEventMessage', listenerCustomEvent)
  }
  return {
    sendMessage: (method, data) => {
      return new Promise((resolve, reject) => {
        const callbackId = ulid()
        callbackMap.set(callbackId, (message) => {
          callbackMap.delete(callbackId)
          if (message.callbackId === callbackId) {
            if (message.error) {
              reject(message.error)
              return
            }
            resolve(message.data)
          }
        })
        window.dispatchEvent(
          new CustomEvent('CustomEventMessage', {
            detail: {
              method,
              data,
              callbackId,
            } satisfies CustomEventMessageRequest,
          }),
        )
      })
    },
    onMessage: (method, callback) => {
      onMessageMap.set(method, callback)
      initListener()
    },
    removeMessage: (method) => {
      onMessageMap.delete(method)
    },
    removeAllListeners: () => {
      onMessageMap.clear()
      window.removeEventListener('CustomEventMessage', listenerCustomEvent)
    },
  }
}
