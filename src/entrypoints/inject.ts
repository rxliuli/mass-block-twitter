import { autoBlockUsers, parseUserRecords } from '$lib/api'
import { dbApi } from '$lib/db'
import { differenceBy, uniqBy } from 'lodash-es'
import { Vista, Middleware } from '@rxliuli/vista'

function twitterMiddleware(): Middleware {
  return async (c, next) => {
    await next()
    if (c.req.headers.get('authorization')) {
      localStorage.setItem(
        'requestHeaders',
        JSON.stringify([...c.req.headers.entries()]),
      )
    }
    if (c.res.headers.get('content-type')?.includes('application/json')) {
      const json = await c.res.json()
      const users = uniqBy(parseUserRecords(json), 'id')
      if (users.length > 0) {
        const blockedUsers = await autoBlockUsers(users)
        await dbApi.users.record(differenceBy(users, blockedUsers, 'id'))
      }
    }
    if (c.req.url === 'https://x.com/i/api/1.1/jot/client_event.json') {
      c.res = new Response(
        JSON.stringify({ success: true, test: 'a' }, null, 2),
        c.res,
      )
    }
  }
}

export default defineUnlistedScript(async () => {
  new Vista().use(twitterMiddleware()).intercept()
})
