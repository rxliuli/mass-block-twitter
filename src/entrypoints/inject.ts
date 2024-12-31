import { parseUserRecords, updateUserRecords } from '@/lib/api'
import { interceptFetch, interceptXHR, Middleware } from '@/lib/interceptors'

export default defineUnlistedScript(async () => {
  const middleware: Middleware = async (c, next) => {
    await next()
    if (c.req.headers.get('authorization')) {
      localStorage.setItem(
        'requestHeaders',
        JSON.stringify([...c.req.headers.entries()]),
      )
    }
    if (c.res.headers.get('content-type')?.includes('application/json')) {
      const json = await c.res.json()
      const users = parseUserRecords(json)
      if (users.length > 0) {
        updateUserRecords(users)
      }
    }
  }
  interceptFetch(middleware)
  interceptXHR(middleware)
})
