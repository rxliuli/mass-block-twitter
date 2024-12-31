import { parseHeadersText } from './utils'

export function normalizeUrl(url: string | URL | Request) {
  if (typeof url === 'string') {
    return url
  }
  if (url instanceof URL) {
    return url.href
  }
  return url.url
}

interface Context {
  req: Request
  res: Response
  [key: string]: any
}

export type Middleware = (
  context: Context,
  next: () => Promise<void>,
) => Promise<void>

async function handleRequest(middlewares: Middleware[], context: Context) {
  const compose = (i: number): Promise<void> => {
    if (i >= middlewares.length) {
      return Promise.resolve()
    }
    return middlewares[i](context, () => compose(i + 1))
  }
  await compose(0)
}

export function interceptFetch(...middlewares: Middleware[]) {
  const pureFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const c: Context = {
      req: new Request(input, init),
      res: new Response(),
    }
    await handleRequest(
      [
        ...middlewares,
        async (context) => {
          context.res = await pureFetch(c.req)
        },
      ],
      c,
    )
    return c.res
  }

  return () => {
    globalThis.fetch = pureFetch
  }
}

declare global {
  interface XMLHttpRequest {
    __request__: {
      open?: [string, string, ...any[]]
      setRequestHeader?: [string, string][]
      addEventListener?: [
        string,
        (this: XMLHttpRequest, ev: ProgressEvent) => any,
        boolean | AddEventListenerOptions | undefined,
      ][]
    }
  }
}

export function interceptXHR(...middlewares: Middleware[]) {
  const pureOpen = XMLHttpRequest.prototype.open
  const pureSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  const pureSend = XMLHttpRequest.prototype.send
  const pureAddEventListener = XMLHttpRequest.prototype.addEventListener

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string,
    ...args: any[]
  ) {
    this.__request__ = {}
    this.__request__.open = [method, url, ...args]
  }
  XMLHttpRequest.prototype.setRequestHeader = function (
    header: string,
    value: string,
  ) {
    this.__request__.setRequestHeader = [
      ...(this.__request__.setRequestHeader ?? []),
      [header, value],
    ]
  }
  XMLHttpRequest.prototype.addEventListener = function (
    this: XMLHttpRequest,
    type: string,
    listener: (this: XMLHttpRequest, ev: ProgressEvent) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.__request__.addEventListener = [
      ...(this.__request__.addEventListener ?? []),
      [type, listener, options],
    ]
  } as any
  XMLHttpRequest.prototype.send = async function (
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const c: Context = {
      req: new Request(this.__request__.open![1], {
        method: this.__request__.open![0],
        headers: this.__request__.setRequestHeader,
        body: body as any,
      }),
      res: new Response(),
    }
    await handleRequest(
      [
        ...middlewares,
        async (c) => {
          pureOpen.apply(this, [
            c.req.method,
            c.req.url,
            ...this.__request__.open!.slice(2),
          ] as any)
          this.__request__.setRequestHeader?.forEach(([name, value]) => {
            pureSetRequestHeader.apply(this, [name, value])
          })
          this.__request__.addEventListener
            ?.filter(([type]) => type !== 'load')
            .forEach(([type, listener, options]) => {
              pureAddEventListener.apply(this, [type, listener as any, options])
            })
          await new Promise<void>((resolve, reject) => {
            pureAddEventListener.apply(this, [
              'load',
              (_ev) => {
                c.res = xhrToResponse(this)
                resolve()
              },
            ])
            pureAddEventListener.apply(this, [
              'error',
              (_ev) => {
                reject(new Error(this.status + ' ' + this.statusText))
              },
            ])
            if (c.req.body) {
              pureSend.apply(this, [c.req.body as any])
            } else {
              pureSend.apply(this)
            }
          })
        },
      ],
      c,
    )
    const xhr = await responseToXHR(c.res, this.responseType)
    this.__request__.addEventListener
      ?.filter(([type]) => type === 'load')
      .forEach(([_type, listener, _options]) => {
        listener.call(xhr, new ProgressEvent('load'))
      })
  }

  return () => {
    XMLHttpRequest.prototype.open = pureOpen
    XMLHttpRequest.prototype.setRequestHeader = pureSetRequestHeader
    XMLHttpRequest.prototype.addEventListener = pureAddEventListener
    XMLHttpRequest.prototype.send = pureSend
  }
}

function xhrToResponse(xhr: XMLHttpRequest) {
  const responseInit = {
    status: xhr.status,
    statusText: xhr.statusText,
    headers: parseHeadersText(xhr.getAllResponseHeaders()),
  }

  let body = xhr.response
  if (xhr.responseType === '' || xhr.responseType === 'text') {
    body = xhr.responseText
  }

  return new Response(body, responseInit)
}

async function responseToXHR(
  response: Response,
  responseType: XMLHttpRequestResponseType,
) {
  const xhr = new XMLHttpRequest()

  let responseValue
  switch (responseType) {
    case 'json':
      responseValue = await response.clone().json()
      break
    case 'blob':
      responseValue = await response.clone().blob()
      break
    case 'arraybuffer':
      responseValue = await response.clone().arrayBuffer()
      break
    case 'document':
    case 'text':
    default:
      responseValue = await response.clone().text()
  }

  Object.defineProperties(xhr, {
    status: { value: response.status },
    statusText: { value: response.statusText },
    responseURL: { value: response.url },
    readyState: { value: 4 },
    response: { value: responseValue },
    responseType: { value: responseType },
    responseText: {
      value:
        responseType === 'text' || responseType === '' ? responseValue : null,
    },
  })

  return xhr
}
