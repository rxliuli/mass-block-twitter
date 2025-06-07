import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { twitter } from './routes/twitter'
import { auth as authRoutes } from './routes/auth'
import { accounts } from './routes/accounts'
import { billing } from './routes/billing'
import { HonoEnv } from './lib/bindings'
import { modlists, modlistSearch } from './routes/modlists'
import { errorHandler } from './middlewares/error'
import { analyze } from './routes/analyze'
import { feedback } from './routes/feedback'
import { image } from './routes/image'
import { migration } from './routes/migration'

const app = new Hono<HonoEnv>()

app
  .use(cors({ origin: '*' }))
  .use(errorHandler())
  .route('/api/twitter', twitter)
  .route('/api/image', image)
  .route('/api/auth', authRoutes)
  .route('/api/feedback', feedback)
  .route('/api/modlists', modlistSearch)
  .route('/api/analyze', analyze)
  .route('/api/migration', migration)
  .route('/api/accounts', accounts)
  .route('/api/billing', billing)
  .route('/api/modlists', modlists)

// @ts-expect-error
import svelteKitWorker from '../../website/.svelte-kit/cloudflare/_worker.js'

app.get('/.well-known/appspecific/*', (c) => c.body(null, 204))
app.all('*', async (c) => {
  if (c.env.APP_ENV === 'development') {
    const url = c.req.url.replace(
      'http://localhost:8787',
      'http://localhost:5173',
    )
    return fetch(new Request(url, c.req))
  }
  const response = await svelteKitWorker.fetch(c.req.raw, c.env, c.executionCtx)
  return response
})

export default app
