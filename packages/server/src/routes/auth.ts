import { zValidator } from '@hono/zod-validator'
import { Context, Hono } from 'hono'
import { z } from 'zod'
import { prismaClients } from '../lib/prisma'
import { HonoEnv, TokenInfo } from '../lib/bindings'
import { generateSecureCode, sha256 } from '../lib/crypto'
import { getTokenInfo } from '../middlewares/auth'

type CreateEmailOptions = {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

const auth = new Hono<HonoEnv>()

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export interface AuthInfo {
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

const verifyEmailRequestSchema = z.object({
  email: z.string().email(),
  code: z.string(),
})

const sendVerifyEmailRequestSchema = z.object({
  email: z.string().email(),
})

async function sendEmail(
  token: string,
  options: CreateEmailOptions,
): Promise<{ error?: any }> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
  if (!resp.ok) {
    return {
      error: await resp.json(),
    }
  }
  return await resp.json()
}

async function sendVerifyEmail(c: Context<HonoEnv>, email: string) {
  let code = await c.env.MY_KV.get('verify-email-' + email)
  if (code) {
    return c.json({
      code: 'verify-email',
    })
  }
  code = generateSecureCode(4)
  const sendResult = await sendEmail(c.env.RESEND_API_KEY, {
    from: 'Mass Block Twitter <support@rxliuli.com>',
    to: email,
    subject: 'Verify Email',
    html: `<p>Verify Email</p>
        <p>Your code is ${code}</p>
        <p>This code will expire in 10 minutes</p>`,
    text: `Verify Email\nYour code is ${code}\nThis code will expire in 10 minutes`,
  })
  if (sendResult.error) {
    console.error('Failed to send email', sendResult.error)
    return c.json(
      { code: 'failed-to-send-email', message: 'Failed to send email' },
      500,
    )
  }
  await c.env.MY_KV.put('verify-email-' + email, code, {
    expirationTtl: 600,
  })
  return c.json({
    code: 'success',
  })
}

auth
  .post('/login', zValidator('json', loginRequestSchema), async (c) => {
    const validated = c.req.valid('json')
    const encryptedPassword = await sha256(validated.password)
    if (!encryptedPassword) {
      return c.json(
        { code: 'invalid-password', message: 'Invalid password' },
        401,
      )
    }
    const prisma = await prismaClients.fetch(c.env.DB)
    const user = await prisma.localUser.findUnique({
      where: {
        email: validated.email,
      },
    })
    async function redirectVerifyEmail(email: string) {
      const resp = await sendVerifyEmail(c, email)
      if (!resp.ok) {
        return c.json(
          {
            code: 'failed-to-send-email',
            message: 'Failed to send email',
          },
          500,
        )
      }
      return c.json({
        code: 'verify-email',
      })
    }
    if (!user) {
      const newUser = await prisma.localUser.create({
        data: {
          email: validated.email,
          password: encryptedPassword,
        },
      })
      return await redirectVerifyEmail(newUser.email)
    }
    if (!user.emailVerified) {
      return await redirectVerifyEmail(user.email)
    }
    if (encryptedPassword !== user.password) {
      return c.json(
        { code: 'invalid-password', message: 'Invalid password' },
        401,
      )
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
      code: 'success',
      data: {
        id: user.id,
        email: user.email,
        token,
        isPro: user.isPro,
      } as AuthInfo,
    })
  })
  .post('/logout', async (c) => {
    const tokenInfo = await getTokenInfo(c)
    if (tokenInfo) {
      await c.env.MY_KV.delete(tokenInfo.token)
    }
    return c.json({ code: 'success' })
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
      const code = generateSecureCode(4)
      if (!code) {
        return c.json({ message: 'failed to generate code' }, 500)
      }
      const sendResult = await sendEmail(c.env.RESEND_API_KEY, {
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
  .post(
    '/send-verify-email',
    zValidator('json', sendVerifyEmailRequestSchema),
    async (c) => {
      const { email } = c.req.valid('json')
      return await sendVerifyEmail(c, email)
    },
  )
  .post(
    '/verify-email',
    zValidator('json', verifyEmailRequestSchema),
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
      const code = await c.env.MY_KV.get('verify-email-' + validated.email)
      if (code !== validated.code) {
        return c.json({ message: 'Invalid code' }, 401)
      }
      await prisma.localUser.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
      await c.env.MY_KV.delete('verify-email-' + validated.email)

      // generate token
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
        code: 'success',
        data: {
          id: user.id,
          email: user.email,
          token,
          isPro: false,
        } as AuthInfo,
      })
    },
  )
export { auth }
