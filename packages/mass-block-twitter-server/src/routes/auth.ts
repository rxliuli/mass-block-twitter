import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { HonoEnv, TokenInfo } from '../lib/bindings'
import { generateSecureCode, sha256 } from '../lib/crypto'
import { Resend } from 'resend'
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

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  password: z.string(),
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
      if (await c.env.MY_KV.get('reset-password-' + validated.email)) {
        return c.json({ message: 'Email already requested' })
      }
      const user = await prisma.localUser.findUnique({
        where: {
          email: validated.email,
        },
      })
      if (!user) {
        // If you use this email, we will send you a reset password email.
        console.log('user not found', validated.email)
        return c.json({ message: 'success' })
      }
      const resend = new Resend(c.env.RESEND_API_KEY)
      const code = generateSecureCode(4)
      if (!code) {
        return c.json({ message: 'failed to generate code' }, 500)
      }
      const sendResult = await resend.emails.send({
        from: 'Mass Block Twitter <support@rxliuli.com>',
        to: validated.email,
        subject: 'Reset Password',
        html: `<p>Reset Password</p>
        <p>Your code is ${code}</p>
        <p>This code will expire in 10 minutes</p>`,
        text: `Reset Password\nYour code is ${code}\nThis code will expire in 10 minutes`,
      })
      if (sendResult.error) {
        console.error('Failed to send email', sendResult.error)
        return c.json({ message: 'Failed to send email' }, 500)
      }
      await c.env.MY_KV.put('reset-password-' + validated.email, code, {
        expirationTtl: 600,
      })
      return c.json({ message: 'success' })
    },
  )
  .post(
    '/reset-password',
    zValidator('json', resetPasswordRequestSchema),
    async (c) => {
      const validated = c.req.valid('json')
      const prisma = await prismaClients.fetch(c.env.DB)
      const user = await prisma.localUser.findUnique({
        where: {
          email: validated.email,
        },
      })
      if (!user) {
        return c.json({ message: 'User not found' }, 404)
      }
      const code = await c.env.MY_KV.get('reset-password-' + validated.email)
      if (code !== validated.code) {
        return c.json({ message: 'Invalid code' }, 401)
      }
      const encryptedPassword = await sha256(validated.password)
      if (!encryptedPassword) {
        return c.json({ message: 'Invalid password' }, 401)
      }
      if (user.password === encryptedPassword) {
        return c.json(
          { message: 'New password cannot be the same as the old password' },
          401,
        )
      }
      await prisma.localUser.update({
        where: { id: user.id },
        data: { password: encryptedPassword, updatedAt: new Date() },
      })
      await c.env.MY_KV.delete('reset-password-' + validated.email)
      return c.json({ message: 'success' })
    },
  )
export { auth }
