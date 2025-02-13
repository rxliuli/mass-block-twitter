import { Context, MiddlewareHandler } from 'hono'
import { HonoEnv, TokenInfo } from '../lib/bindings'

export async function getTokenInfo(
  c: Context<HonoEnv>,
): Promise<(TokenInfo & { token: string }) | undefined> {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return
  }
  const tokenInfoStr = await c.env.MY_KV.get(token)
  if (!tokenInfoStr) {
    return
  }
  const tokenInfo = JSON.parse(tokenInfoStr) as TokenInfo
  tokenInfo.updatedAt = new Date().toISOString()
  await c.env.MY_KV.put(token, JSON.stringify(tokenInfo))
  return {
    ...tokenInfo,
    token,
  }
}

export function auth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const tokenInfo = await getTokenInfo(c)
    if (!tokenInfo) {
      c.res = c.json({ error: 'Unauthorized' }, 401)
      return
    }
    
    c.set('tokenInfo', tokenInfo)
    return next()
  }
}
