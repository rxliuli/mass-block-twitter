import { Hono } from 'hono'
import { prismaClients } from '../lib/prisma'
import { HonoEnv } from '../lib/bindings'
import { LocalUser } from '@prisma/client'

const accounts = new Hono<HonoEnv>()

export type AccountSettingsResponse = Pick<
  LocalUser,
  'id' | 'email' | 'isPro' | 'createdAt' | 'updatedAt' | 'lastLogin'
>
export type AccountSettingsError = {
  code: 'UserNotFound'
}
accounts.get('/settings', async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('tokenInfo')
  const user = await prisma.localUser.findUnique({
    where: { id: tokenInfo.id },
    select: {
      id: true,
      email: true,
      isPro: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
    },
  })
  if (!user) {
    return c.json<AccountSettingsError>({ code: 'UserNotFound' }, 404)
  }
  return c.json<AccountSettingsResponse>(user)
})

export { accounts }
