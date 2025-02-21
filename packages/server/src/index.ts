import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { twitter } from './routes/twitter'
import { auth } from './middlewares/auth'
import { auth as authRoutes } from './routes/auth'
import { accounts } from './routes/accounts'
import { billing } from './routes/billing'
import { HonoEnv } from './lib/bindings'
import { modlists, modlistSearch } from './routes/modlists'
import { ulid } from 'ulidx'
import { errorHandler } from './middlewares/error'
import { prismaClients } from './lib/prisma'

const app = new Hono<HonoEnv>()

app
  .use(cors({ origin: '*' }))
  .use(errorHandler())
  .get('/all', async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB)
    const users = await prisma.user.findMany()
    const tweets = await prisma.tweet.findMany()
    return c.json({
      users,
      tweets,
    })
  })
  .get('/ulid', (c) => c.json(ulid()))
  // TODO: remove this once we have a proper domain
  .route('/', twitter)
  .route('/api/twitter', twitter)
  .route('/api/auth', authRoutes)
  .route('/api/modlists', modlistSearch)
  .use(auth())
  .route('/api/accounts', accounts)
  .route('/api/billing', billing)
  .route('/api/modlists', modlists)
export default app
