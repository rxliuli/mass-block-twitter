import { describe, expect, it } from 'vitest'
import { middleware } from '../middleware'
import { range, sum } from 'es-toolkit'

describe('middleware', () => {
  it('should execute the middleware', async () => {
    const c = { value: 0 }
    const m = middleware(c)
    const items = range(100)
    items.forEach((i) =>
      m.use((c, next) => {
        c.value += i
        next()
      }),
    )
    await m.run()
    expect(c.value).eq(sum(items))
  })
  it('should execute the middleware with error', async () => {
    const c = { value: 0 }
    const m = middleware(c)
    const items = range(100)
    items.forEach((i) =>
      m.use(async (c, next) => {
        if (i === 50) {
          throw new Error('error')
        }
        c.value += i
        await next()
      }),
    )
    await expect(m.run()).rejects.toThrowError()
    expect(c.value).eq(sum(items.slice(0, 50)))
  })
})
