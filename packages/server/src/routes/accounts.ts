import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { localUser } from '../db/schema'
import { eq, InferSelectModel } from 'drizzle-orm'
import { auth, generateToken, JWT_EXPIRE_TIME } from '../middlewares/auth'
import { useDB } from '../lib/drizzle'

const accounts = new Hono<HonoEnv>().use(auth()).use(useDB())

type LocalUser = InferSelectModel<typeof localUser>
export type AccountSettingsResponse = Pick<
  LocalUser,
  'id' | 'email' | 'isPro' | 'createdAt' | 'updatedAt' | 'lastLogin'
> & {
  newToken?: string
}
export type AccountSettingsError = {
  code: 'UserNotFound'
}

accounts.get('/settings', async (c) => {
  const tokenInfo = c.get('jwtPayload')
  const db = c.get('db')
  const [_user] = await db
    .select({
      id: localUser.id,
      email: localUser.email,
      isPro: localUser.isPro,
      createdAt: localUser.createdAt,
      updatedAt: localUser.updatedAt,
      lastLogin: localUser.lastLogin,
    })
    .from(localUser)
    .where(eq(localUser.id, tokenInfo.sub))
  if (!_user) {
    return c.json<AccountSettingsError>({ code: 'UserNotFound' }, 404)
  }
  if (tokenInfo.exp - Math.floor(Date.now() / 1000) <= JWT_EXPIRE_TIME / 2) {
    const token = await generateToken(c.env, {
      sub: tokenInfo.sub,
    })
    return c.json<AccountSettingsResponse>({
      ..._user,
      newToken: token,
    })
  }
  return c.json<AccountSettingsResponse>({ ..._user })
})

export { accounts }
