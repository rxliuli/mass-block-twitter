import { describe, expect, it, vi } from 'vitest'
import { batchExecute, ExecuteOperationContext } from '../batch'
import { Handler, middleware } from '../middleware'
import { range } from 'lodash-es'
import { wait } from '@liuli-util/async'

describe('batchExecute', () => {
  it('should execute the batch', async () => {
    let f = vi.fn<(i: number) => void>()
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => [1, 2, 3],
      execute: async (item) => {
        return item
      },
      onProcessed: async (context) => {
        f(context.progress.processed)
      },
    })
    expect(result.success).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.results).toEqual([1, 2, 3])
    expect(f.mock.calls.map((it) => it[0])).toEqual([1, 2, 3])
  })
  it('should abort the batch', async () => {
    let f = vi.fn<(i: number) => void>()
    const controller = new AbortController()
    const result = await batchExecute({
      controller,
      getItems: () => [1, 2, 3],
      execute: async (item) => {
        return item
      },
      onProcessed: async (context) => {
        if (context.progress.processed === 2) {
          controller.abort()
        }
        f(context.progress.processed)
      },
    })
    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.results).toEqual([1, 2])
    expect(f.mock.calls.map((it) => it[0])).toEqual([1, 2])
  })
  it('should execute the batch in dynamic data', async () => {
    let f = vi.fn()
    const array = range(1000)
    const items = array.slice(0, 10)
    await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      execute: f,
      onProcessed: async (c) => {
        const last = c.index === items.length - 1
        const hasNext = c.index < array.length - 1
        if (last && hasNext) {
          items.push(...array.slice(c.index + 1, c.index + 1 + 10))
        }
      },
    })
    expect(f).toHaveBeenCalledTimes(1000)
    expect(f.mock.calls.map((it) => it[0])).toEqual(array)
  })
  it('should abort the batch in throw error', async () => {
    const before = vi.fn()
    const after = vi.fn()
    const controller = new AbortController()
    const result = await batchExecute({
      controller,
      getItems: () => [1, 2, 3, 4],
      execute: async (item) => {
        if (item === 2) {
          throw new Error('safe')
        }
        if (item === 3) {
          throw new Error('unsafe')
        }
        return item
      },
      onProcessed: async (c) => {
        before(c.item)
        if (c.error && c.error instanceof Error) {
          if (c.error.message === 'safe') {
            return
          }
          if (c.error.message === 'unsafe') {
            c.controller.abort()
            return
          }
        }
        after(c.item)
      },
    })
    expect(before).toHaveBeenCalledTimes(3)
    expect(before.mock.calls.map((it) => it[0])).toEqual([1, 2, 3])
    expect(after).toHaveBeenCalledTimes(1)
    expect(after.mock.calls.map((it) => it[0])).toEqual([1])
  })
  it('should remaining time', async () => {
    const len = 10
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => range(len),
      execute: async (item) => {
        await wait(10)
        return item
      },
      onProcessed: async (c) => {
        const expected = (len - c.index - 1) * 10
        expect(c.progress.remainingTime).gte(expected)
      },
    })
    expect(result.success).eq(len)
    expect(result.failed).eq(0)
    expect(result.results).toEqual(range(len))
  })
  it('should remaining time in dynamic data', async () => {
    const array = range(50)
    const items = array.slice(0, 10)
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      execute: async (item) => {
        await wait(10)
        return item
      },
      onProcessed: async (c) => {
        const expected = (10 - c.index - 1) * 10
        expect(c.progress.remainingTime).gte(expected)

        const last = c.index === items.length - 1
        const hasNext = c.index < array.length - 1
        if (last && hasNext) {
          items.push(...array.slice(c.index + 1, c.index + 1 + 10))
        }
      },
    })
    expect(result.success).eq(array.length)
    expect(result.failed).eq(0)
    expect(result.results).toEqual(array)
  })
  it('should remaining time in dynamic data and static total', async () => {
    const array = range(50)
    const items = array.slice(0, 10)
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      total: array.length,
      execute: async (item) => {
        await wait(10)
        return item
      },
      onProcessed: async (c) => {
        const expected = (array.length - c.index - 1) * 10
        expect(c.progress.remainingTime).gte(expected)

        const last = c.index === items.length - 1
        const hasNext = c.index < array.length - 1
        if (last && hasNext) {
          items.push(...array.slice(c.index + 1, c.index + 1 + 10))
        }
      },
    })
    expect(result.success).eq(array.length)
    expect(result.failed).eq(0)
    expect(result.results).toEqual(array)
  })
  it('should execute the batch and middleware', async () => {
    const catchError = vi.fn<Handler<ExecuteOperationContext<number, number>>>(
      async (c, next) => {
        if (c.error) {
          return
        }
        await next()
      },
    )
    const logger = vi.fn<Handler<ExecuteOperationContext<number, number>>>()
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => [1, 2, 3],
      execute: async (item) => {
        if (item === 2) {
          throw new Error('error')
        }
        return item
      },
      onProcessed: (c) => middleware(c).use(catchError).use(logger).run(),
    })
    expect(catchError.mock.calls.length).toBe(3)
    expect(logger.mock.calls.length).toBe(2)
  })
})
