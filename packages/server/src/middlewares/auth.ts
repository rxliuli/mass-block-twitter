import { Context, MiddlewareHandler } from 'hono'
import { HonoEnv, TokenInfo } from '../lib/bindings'
import { jwt, sign, verify } from 'hono/jwt'

export async function getTokenInfo(
  c: Context<HonoEnv>,
): Promise<TokenInfo | undefined> {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    const tokenInfo = payload as unknown as TokenInfo
    return tokenInfo
  } catch (error) {
    return
  }
}

export async function generateToken(
  env: { JWT_SECRET: string },
  tokenInfo: Omit<TokenInfo, 'updatedAt'>,
): Promise<string> {
  const payload = {
    ...tokenInfo,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    iat: Math.floor(Date.now() / 1000),
  }
  return sign(payload, env.JWT_SECRET)
}

export function auth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    // TODO temp
    if (c.req.url === '/api/modlists/search') {
      return next()
    }
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return c.json({ code: 'Unauthorized' }, 401)
    }
    if (token.length === 64) {
      return c.json({ code: 'Unauthorized' }, 401)
    }
    const jwtMiddleware = jwt({
      secret: c.env.JWT_SECRET,
    })
    try {
      return await jwtMiddleware(c, next)
    } catch (error) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
}
