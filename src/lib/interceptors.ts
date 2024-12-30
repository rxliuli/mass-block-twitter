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

export interface InterceptOptions {
  request?: (req: Request) => Request
  response?: (req: Request, res: Response) => Response | Promise<Response>
}

declare global {
  interface XMLHttpRequest {
    _method: string
    _url: string
    _requestHeaders: Record<string, string>
  }
}

export function interceptXHR(options: InterceptOptions) {
  const pureOpen = XMLHttpRequest.prototype.open
  const pureSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

  // @ts-expect-error
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    // Store the method and URL
    this._method = method
    this._url = url instanceof URL ? url.toString() : url

    // Create a custom object to store headers
    this._requestHeaders = {}

    // Call the original open method
    return pureOpen.apply(this, [method, url, ...args] as any)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    // Store each header in the custom object
    this._requestHeaders[header] = value

    // Call the original setRequestHeader method
    return pureSetRequestHeader.apply(this, [header, value])
  }

  const pureSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.send = function (body) {
    const originalRequest = new Request(this._url, {
      method: this._method,
      headers: this._requestHeaders,
      body: body as any,
    })

    const req = options.request
      ? options.request(originalRequest)
      : originalRequest

    if (options.response) {
      this.addEventListener(
        'load',
        function (this: XMLHttpRequest, ev: ProgressEvent) {
          const res = new Response(this.responseText, {
            status: this.status,
            statusText: this.statusText,
            headers: parseHeadersText(this.getAllResponseHeaders()),
          })
          options.response?.(req, res)
        },
      )
    }

    return pureSend.apply(this, [body])
  }

  return () => {
    // Restore original methods
    XMLHttpRequest.prototype.open = pureOpen
    XMLHttpRequest.prototype.setRequestHeader = pureSetRequestHeader
    XMLHttpRequest.prototype.send = pureSend
  }
}

export function interceptFetch(options: InterceptOptions) {
  const pureFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    const res = await pureFetch(options.request?.(req) ?? req, init)
    return (await options.response?.(req, res)) ?? res
  }
  return () => {
    globalThis.fetch = pureFetch
  }
}
