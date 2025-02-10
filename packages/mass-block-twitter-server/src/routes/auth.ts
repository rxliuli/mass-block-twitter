import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { HonoEnv, TokenInfo } from '../lib/bindings'
import { sha256 } from '../lib/crypto'
const auth = new Hono<HonoEnv>()

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

interface AuthInfo {
  id: string
  email: string
  token: string
  isPro: boolean
}

const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
})

auth
  .post('/login', zValidator('json', loginRequestSchema), async (c) => {
    const validated = c.req.valid('json')
    const encryptedPassword = await sha256(validated.password)
    if (!encryptedPassword) {
      return c.json({ message: 'Invalid password' }, 401)
    }
    const prisma = await prismaClients.fetch(c.env.DB)
    const user = await prisma.localUser.findUnique({
      where: {
        email: validated.email,
      },
    })
    if (!user) {
      const newUser = await prisma.localUser.create({
        data: {
          email: validated.email,
          password: encryptedPassword,
        },
      })
      const token = (await sha256({
        id: newUser.id,
        email: newUser.email,
        createdAt: new Date().toISOString(),
      }))!
      await c.env.MY_KV.put(
        token,
        JSON.stringify({
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          id: newUser.id,
          email: newUser.email,
        } satisfies TokenInfo),
      )
      return c.json({
        id: newUser.id,
        email: newUser.email,
        token,
        isPro: false,
      } as AuthInfo)
    }
    if (encryptedPassword !== user.password) {
      return c.json({ message: 'Invalid password' }, 401)
    }
    user.lastLogin = new Date()
    await prisma.localUser.update({
      where: { id: user.id },
      data: user,
    })
    const token = (await sha256({
      id: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    }))!
    await c.env.MY_KV.put(
      token,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: user.id,
        email: user.email,
      } satisfies TokenInfo),
    )
    return c.json({
      id: user.id,
      email: user.email,
      token,
      isPro: user.isPro,
    } as AuthInfo)
  })
  .post('/logout', async (c) => {
    const token = c.req.header('Authorization')
    if (token) {
      await c.env.MY_KV.delete(token)
    }
    return c.json({ message: 'success' })
  })
  .post(
    '/forgot-password',
    zValidator('json', forgotPasswordRequestSchema),
    async (c) => {
      const validated = c.req.valid('json')
      const prisma = await prismaClients.fetch(c.env.DB)
      const user = await prisma.localUser.findUnique({
        where: {
          email: validated.email,
        },
      })
      if (!user) {
        // If you use this email, we will send you a reset password email.
        return c.json({ message: 'success' })
      }
      return c.json({ message: 'success' })
    },
  )

export { auth }
