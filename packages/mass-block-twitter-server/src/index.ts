import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { twitter } from './routes/twitter'
import { auth } from './middlewares/auth'
import { auth as authRoutes } from './routes/auth'
import { accounts } from './routes/accounts'
import { billing } from './routes/billing'
import { HonoEnv } from './lib/bindings'

const app = new Hono<HonoEnv>()

app
  .use(cors({ origin: '*' }))
  // TODO: remove this once we have a proper domain
  .route('/', twitter)
  .route('/api/twitter', twitter)
  .route('/api/auth', authRoutes)
  .use(auth())
  .route('/api/accounts', accounts)
  .route('/api/billing', billing)

export default app
