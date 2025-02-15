import { Hono } from 'hono'
import { prismaClients } from '../lib/prisma'
import { HonoEnv } from '../lib/bindings'

const accounts = new Hono<HonoEnv>()

accounts.get('/settings', async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  const tokenInfo = c.get('tokenInfo')
  await prisma.localUser.delete({
    where: { email: 'i@rxliuli.com' },
  })
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
    return c.json({ error: 'User not found' }, 404)
  }
  return c.json(user)
})

export { accounts }
