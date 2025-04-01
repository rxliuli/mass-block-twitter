import { Context, MiddlewareHandler } from 'hono'
import { HonoEnv, JwtPayload, TokenInfo } from '../lib/bindings'
import { jwt, sign, verify } from 'hono/jwt'

export async function getTokenInfo(
  c: Context<HonoEnv>,
): Promise<JwtPayload | undefined> {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    const tokenInfo = payload as unknown as JwtPayload
    return tokenInfo
  } catch (error) {
    return
  }
}

export const JWT_EXPIRE_TIME = 60 * 60 * 24 * 30

export async function generateToken(
  env: { JWT_SECRET: string },
  tokenInfo: Omit<TokenInfo, 'updatedAt'>,
): Promise<string> {
  const payload = {
    ...tokenInfo,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRE_TIME,
    iat: Math.floor(Date.now() / 1000),
  }
  return sign(payload, env.JWT_SECRET)
}

export function auth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    if (
      c.req.url === '/api/modlists/search' ||
      c.req.url.startsWith('/api/modlists/ids/')
    ) {
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
      return await jwtMiddleware(c, async () => {
        if (await c.env.MY_KV.get(`logout-${token}`)) {
          c.res = c.json({ code: 'Unauthorized' }, 401)
          return
        }
        await next()
      })
    } catch (error) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
}
