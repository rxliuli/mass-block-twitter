export const crossFetch: typeof fetch = async (url, options) => {
  const resp = await fetch(url, options)
  if (resp.status === 401) {
    document.dispatchEvent(new Event('TokenExpired'))
  }
  return resp
}
