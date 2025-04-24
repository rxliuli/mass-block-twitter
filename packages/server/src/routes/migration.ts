import { Context, Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { bearerAuth } from 'hono/bearer-auth'
import { drizzle } from 'drizzle-orm/d1'
import { modList } from '../db/schema'
import { eq } from 'drizzle-orm'
import { streamText } from 'hono/streaming'
import { uploadAvatar } from './modlists'

const migration = new Hono<HonoEnv>()
  .use(
    bearerAuth({
      verifyToken: async (token, c: Context<HonoEnv>) => {
        return token === c.env.ADMIN_TOKEN
      },
    }),
  )
  .use(async (c, next) => {
    if (c.env.APP_ENV !== 'development') {
      return c.text('Not allowed', 403)
    }
    await next()
  })

migration.post('/modlist/update-avatar', async (c) => {
  const db = drizzle(c.env.DB)
  const modLists = (await db.select().from(modList)).filter(
    (it) => it.avatar && it.avatar.startsWith('data:'),
  )
  return streamText(c, async (stream) => {
    const before = c.env.APP_ENV
    c.env.APP_ENV = 'production'
    for (const it of modLists) {
      const avatar = await uploadAvatar(c, it.avatar!)
      await db.update(modList).set({ avatar }).where(eq(modList.id, it.id))
      await stream.writeln(it.id)
    }
    c.env.APP_ENV = before
  })
})

export { migration }
