import { MiddlewareHandler } from 'hono'
import { HonoEnv, TokenInfo } from '../lib/bindings'

export function auth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const token = c.req.header('Authorization')
    if (!token) {
      c.res = c.json({ error: 'Unauthorized' }, 401)
      return
    }
    const tokenInfoStr = await c.env.MY_KV.get(token)
    if (!tokenInfoStr) {
      c.res = c.json({ error: 'Unauthorized' }, 401)
      return
    }
    const tokenInfo = JSON.parse(tokenInfoStr) as TokenInfo
    tokenInfo.updatedAt = new Date().toISOString()
    await c.env.MY_KV.put(token, JSON.stringify(tokenInfo))
    c.set('tokenInfo', tokenInfo)
    return next()
  }
}
