import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { twitter } from './routes/twitter'
import { auth } from './middlewares/auth'
import { auth as authRoutes } from './routes/auth'
import { accounts } from './routes/accounts'
import { billing } from './routes/billing'
import { HonoEnv } from './lib/bindings'
import { modlists, modlistSearch } from './routes/modlists'
import { errorHandler } from './middlewares/error'
import { analyze } from './routes/analyze'
import { feedback } from './routes/feedback'

const app = new Hono<HonoEnv>()

app
  .use(cors({ origin: '*' }))
  .use(errorHandler())
  .route('/api/twitter', twitter)
  .route('/api/auth', authRoutes)
  .route('/api/feedback', feedback)
  .route('/api/modlists', modlistSearch)
  .route('/api/analyze', analyze)
  .route('/api/accounts', accounts)
  .route('/api/billing', billing)
  .route('/api/modlists', modlists)

export default app
