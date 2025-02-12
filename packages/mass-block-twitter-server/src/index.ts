import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { twitter } from './routes/twitter'
import { auth } from './middlewares/auth'
import { auth as authRoutes } from './routes/auth'
import { accounts } from './routes/accounts'
import { billing } from './routes/billing'
import { HonoEnv } from './lib/bindings'
import { modlists, modlistSearch } from './routes/modlists'
import { ulid } from './lib/ulid'

const app = new Hono<HonoEnv>()

app
  .use(cors({ origin: '*' }))
  .get('/ping', (c) => c.json(ulid()))
  // TODO: remove this once we have a proper domain
  .route('/', twitter)
  .route('/api/twitter', twitter)
  .route('/api/auth', authRoutes)
  .route('/api/modlists/search', modlistSearch)
  .use(auth())
  .route('/api/accounts', accounts)
  .route('/api/billing', billing)
  .route('/api/modlists', modlists)
export default app
