import { messager } from './messaging'
import { parse, stringifyAsync } from './serializer'

export const crossFetch: typeof fetch = async (url, options) => {
  // proxying fetch on firefox, fuck firefox csp
  if (import.meta.env.FIREFOX) {
    try {
      // console.log('Using crossFetch proxy for Firefox request', url, options)
      const r = await messager.sendMessage(
        'fetch',
        await stringifyAsync([url, options]),
      )
      // console.log('Using crossFetch proxy for Firefox response', r)
      return parse(r) as ReturnType<typeof fetch>
    } catch (err) {
      console.error('Using crossFetch proxy for Firefox error', err)
      throw err
    }
  }
  const resp = await fetch(url, options)
  if (resp.status === 401) {
    document.dispatchEvent(new Event('TokenExpired'))
  }
  return resp
}
