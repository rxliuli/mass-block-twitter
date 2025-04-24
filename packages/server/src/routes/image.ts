import { Hono } from 'hono'
import { HonoEnv } from '../lib/bindings'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const image = new Hono<HonoEnv>()

image.get(
  '/get/:id',
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const validated = c.req.valid('param')
    const object = await c.env.MY_BUCKET.get(validated.id)
    if (!object) {
      return c.json({ error: 'File not found' }, 404)
    }
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    return new Response(object.body, {
      headers,
    })
  },
)

export { image }
