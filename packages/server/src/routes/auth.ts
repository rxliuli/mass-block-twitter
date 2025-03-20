import { zValidator } from '@hono/zod-validator'
import { Context, Hono } from 'hono'
import { z } from 'zod'
import { HonoEnv } from '../lib/bindings'
import { generateSecureCode, sha256 } from '../lib/crypto'
import { generateToken, getTokenInfo } from '../middlewares/auth'
import { drizzle } from 'drizzle-orm/d1'
import { localUser } from '../db/schema'
import { eq } from 'drizzle-orm'

type CreateEmailOptions = {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

const auth = new Hono<HonoEnv>()

export interface AuthInfo {
  id: string
  email: string
  token: string
  isPro: boolean
}

const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
})

async function sendEmail(
  token: string,
  options: CreateEmailOptions,
): Promise<{ error?: any }> {
  try {
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
  } catch (error) {
    return { error }
  }
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
    expiration: Math.floor(Date.now() / 1000) + 600,
  })
  return c.json({
    code: 'success',
  })
}

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse =
  | {
      code: 'success'
      data: AuthInfo
    }
  | {
      code: 'verify-email'
    }
export type LoginErrorResponse = {
  code: 'invalid-password' | 'failed-to-send-email'
}
auth.post('/login', zValidator('json', loginRequestSchema), async (c) => {
  const validated = c.req.valid('json')
  const encryptedPassword = await sha256(validated.password)
  if (!encryptedPassword) {
    return c.json({ code: 'invalid-password' }, 401)
  }
  const db = drizzle(c.env.DB)
  const user = await db
    .select()
    .from(localUser)
    .where(eq(localUser.email, validated.email))
    .limit(1)
    .get()
  async function redirectVerifyEmail(email: string) {
    const resp = await sendVerifyEmail(c, email)
    if (!resp.ok) {
      return c.json({ code: 'failed-to-send-email' }, 500)
    }
    return c.json({ code: 'verify-email' })
  }
  if (!user) {
    await db.insert(localUser).values({
      email: validated.email,
      password: encryptedPassword,
    })
    return await redirectVerifyEmail(validated.email)
  }
  if (!user.emailVerified) {
    return await redirectVerifyEmail(validated.email)
  }
  if (encryptedPassword !== user.password) {
    return c.json({ code: 'invalid-password' }, 401)
  }
  await db
    .update(localUser)
    .set({
      lastLogin: new Date().toISOString(),
    })
    .where(eq(localUser.id, user.id))
  const token = await generateToken(c.env, {
    sub: user.id,
  })
  return c.json<LoginResponse>({
    code: 'success',
    data: {
      id: user.id,
      email: user.email!,
      token,
      isPro: user.isPro!,
    } satisfies AuthInfo,
  })
})

const verifyEmailRequestSchema = z.object({
  email: z.string().email(),
  code: z.string(),
})
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
auth.post(
  '/verify-email',
  zValidator('json', verifyEmailRequestSchema),
  async (c) => {
    const validated = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const user = await db
      .select()
      .from(localUser)
      .where(eq(localUser.email, validated.email))
      .limit(1)
      .get()
    if (!user) {
      return c.json({ message: 'User not found' }, 404)
    }
    const code = await c.env.MY_KV.get('verify-email-' + validated.email)
    if (code !== validated.code) {
      return c.json({ message: 'Invalid code' }, 401)
    }
    await db
      .update(localUser)
      .set({
        emailVerified: true,
      })
      .where(eq(localUser.id, user.id))
    await c.env.MY_KV.delete('verify-email-' + validated.email)

    // generate token
    const token = await generateToken(c.env, {
      sub: user.id,
    })
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
auth
  .post('/logout', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return c.json({ code: 'success' })
    }
    const tokenInfo = await getTokenInfo(c)
    if (!tokenInfo) {
      return c.json({ code: 'success' })
    }
    await c.env.MY_KV.put(`logout-${token}`, tokenInfo.sub, {
      expiration: tokenInfo.exp,
    })
    return c.json({ code: 'success' })
  })
  .post(
    '/forgot-password',
    zValidator('json', forgotPasswordRequestSchema),
    async (c) => {
      const validated = c.req.valid('json')
      const db = drizzle(c.env.DB)
      if (await c.env.MY_KV.get('reset-password-' + validated.email)) {
        return c.json({ message: 'Email already requested' })
      }
      const user = await db
        .select()
        .from(localUser)
        .where(eq(localUser.email, validated.email))
        .limit(1)
        .get()
      if (!user) {
        // If you use this email, we will send you a reset password email.
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
        expiration: Math.floor(Date.now() / 1000) + 600,
      })
      return c.json({ message: 'success' })
    },
  )

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  password: z.string(),
})
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
auth.post(
  '/reset-password',
  zValidator('json', resetPasswordRequestSchema),
  async (c) => {
    const validated = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const user = await db
      .select()
      .from(localUser)
      .where(eq(localUser.email, validated.email))
      .limit(1)
      .get()
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
    await db
      .update(localUser)
      .set({
        password: encryptedPassword,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(localUser.id, user.id))
    await c.env.MY_KV.delete('reset-password-' + validated.email)
    return c.json({ message: 'success' })
  },
)

const sendVerifyEmailRequestSchema = z.object({
  email: z.string().email(),
})
export type SendVerifyEmailRequest = z.infer<
  typeof sendVerifyEmailRequestSchema
>
auth.post(
  '/send-verify-email',
  zValidator('json', sendVerifyEmailRequestSchema),
  async (c) => {
    const { email } = c.req.valid('json')
    return await sendVerifyEmail(c, email)
  },
)

export { auth }
