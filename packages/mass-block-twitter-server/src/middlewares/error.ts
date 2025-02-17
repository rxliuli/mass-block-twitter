import { MiddlewareHandler } from 'hono'
import { serializeError } from 'serialize-error'

export function errorHandler(): MiddlewareHandler {
  return async (c, next) => {
    await next()
    if (c.error) {
      console.error(serializeError(c.error))
    }
  }
}
