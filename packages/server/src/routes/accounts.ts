import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { localUser } from '../db/schema'
import { drizzle } from 'drizzle-orm/d1'
import { InferSelectModel } from 'drizzle-orm'

const accounts = new Hono<HonoEnv>()

type LocalUser = InferSelectModel<typeof localUser>
export type AccountSettingsResponse = Pick<
  LocalUser,
  'id' | 'email' | 'isPro' | 'createdAt' | 'updatedAt' | 'lastLogin'
>
export type AccountSettingsError = {
  code: 'UserNotFound'
}
accounts.get('/settings', async (c) => {
  const tokenInfo = c.get('jwtPayload')
  const db = drizzle(c.env.DB)
  const _user = await db
    .select({
      id: localUser.id,
      email: localUser.email,
      isPro: localUser.isPro,
      createdAt: localUser.createdAt,
      updatedAt: localUser.updatedAt,
      lastLogin: localUser.lastLogin,
    })
    .from(localUser)
    .get({ id: tokenInfo.sub })
  if (!_user) {
    return c.json<AccountSettingsError>({ code: 'UserNotFound' }, 404)
  }
  return c.json<AccountSettingsResponse>(_user)
})

export { accounts }
