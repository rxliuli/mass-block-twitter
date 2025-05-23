import { describe, expect, it, vi } from 'vitest'
import {
  batchExecute,
  batchQuery,
  ExecuteOperationContext,
  QueryOperationContext,
} from '../batch'
import { MiddlewareHandler, middleware } from '../middleware'
import { range } from 'es-toolkit'
import { wait } from '@liuli-util/async'
import { last } from 'es-toolkit'

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
    expect(result.success).eq(3)
    expect(result.failed).eq(0)
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
    expect(result.success).eq(2)
    expect(result.failed).eq(0)
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
    const catchError = vi.fn<
      MiddlewareHandler<ExecuteOperationContext<number, number>>
    >(async (c, next) => {
      if (c.error) {
        return
      }
      await next()
    })
    const logger =
      vi.fn<MiddlewareHandler<ExecuteOperationContext<number, number>>>()
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
    expect(catchError.mock.calls.length).eq(3)
    expect(logger.mock.calls.length).eq(2)
  })
  it('should execute the batch with array', async () => {
    const onProcessed = vi
      .fn<(context: ExecuteOperationContext<number[], void>) => Promise<void>>()
      .mockImplementation(async (c) => {
        if (c.error) {
          c.controller.abort()
          return
        }
      })
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      execute: async (item) => {
        if (item[0] === 4) {
          throw new Error()
        }
      },
      onProcessed,
    })
    expect(result.success).eq(3)
    expect(result.failed).eq(3)
    const [a1, a2] = onProcessed.mock.calls.map((it) => it[0])
    expect(a1.progress.processed).eq(3)
    expect(a1.progress.successful).eq(3)
    expect(a1.progress.failed).eq(0)
    expect(a2.progress.processed).eq(6)
    expect(a2.progress.successful).eq(3)
    expect(a2.progress.failed).eq(3)
  })
})

describe('batchQuery', () => {
  it('should query the batch', async () => {
    const f = vi.fn()
    const items = range(1000)
    let index = 0
    await batchQuery({
      controller: new AbortController(),
      getItems: () => items.slice(0, index),
      fetchNextPage: async () => (index += 20),
      hasNext: () => index < items.length,
      onProcessed: f,
    })
    expect(f).toHaveBeenCalledTimes(50)
  })
  it('should query the batch with abort', async () => {
    const f = vi
      .fn<(c: QueryOperationContext<number>) => Promise<void>>()
      .mockImplementation(async (c) => {
        if (c.index === 19) {
          c.controller.abort()
        }
      })
    const items = range(1000)
    let index = 0
    await batchQuery({
      controller: new AbortController(),
      getItems: () => items.slice(0, index),
      fetchNextPage: async () => (index += 20),
      hasNext: () => index < items.length,
      onProcessed: f,
    })
    expect(f).toHaveBeenCalledTimes(20)
    expect(last(f.mock.calls)![0].items).toEqual(items.slice(0, 400))
  })
})

describe('batchExecute concurrency', () => {
  it('should execute with specified concurrency', async () => {
    const concurrency = 3
    const items = range(10)
    const executing = new Set<number>()
    const maxConcurrent = { value: 0 }

    const start = Date.now()
    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      concurrency,
      execute: async (item) => {
        executing.add(item)
        maxConcurrent.value = Math.max(maxConcurrent.value, executing.size)
        await wait(10)
        executing.delete(item)
        return item
      },
      onProcessed: async () => {},
    })

    expect(maxConcurrent.value).toBe(concurrency)
    expect(result.success).toBe(items.length)
    expect(result.results).toEqual(items)
    expect(Date.now() - start).toBeLessThan(items.length * 10)
  })

  it('should maintain order with concurrency', async () => {
    const concurrency = 3
    const items = range(10)
    const executionOrder: number[] = []
    const completionOrder: number[] = []

    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      concurrency,
      execute: async (item) => {
        executionOrder.push(item)
        await wait(Math.random() * 10)
        completionOrder.push(item)
        return item
      },
      onProcessed: async () => {},
    })

    expect(executionOrder).toEqual(range(10))
    expect(completionOrder).not.toEqual(range(10))
    expect(result.results).toEqual(items)
  })

  it('should handle dynamic data with concurrency', async () => {
    const concurrency = 3
    const array = range(50)
    const items = array.slice(0, 10)
    const executing = new Set<number>()
    const maxConcurrent = { value: 0 }

    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      concurrency,
      execute: async (item) => {
        executing.add(item)
        maxConcurrent.value = Math.max(maxConcurrent.value, executing.size)
        await wait(10)
        executing.delete(item)
        return item
      },
      onProcessed: async (c) => {
        const last = c.index === items.length - 1
        const hasNext = c.index < array.length - 1
        if (last && hasNext) {
          items.push(...array.slice(c.index + 1, c.index + 1 + 10))
        }
      },
    })

    expect(maxConcurrent.value).toBe(concurrency)
    expect(result.success).toBe(array.length)
    expect(result.results).toEqual(array)
  })

  it('should handle errors with concurrency', async () => {
    const concurrency = 3
    const items = range(10)
    const executing = new Set<number>()
    const maxConcurrent = { value: 0 }
    const errors: number[] = []

    const result = await batchExecute({
      controller: new AbortController(),
      getItems: () => items,
      concurrency,
      execute: async (item) => {
        executing.add(item)
        maxConcurrent.value = Math.max(maxConcurrent.value, executing.size)
        await wait(10)
        executing.delete(item)
        if (item % 2 === 0) {
          throw new Error(`Error for ${item}`)
        }
        return item
      },
      onProcessed: async (c) => {
        if (c.error) {
          errors.push(c.item as number)
        }
      },
    })

    expect(maxConcurrent.value).toBe(concurrency)
    expect(result.success).toBe(5)
    expect(result.failed).toBe(5)
    expect(errors).toEqual([0, 2, 4, 6, 8])
  })

  it('should handle abort with concurrency', async () => {
    const concurrency = 3
    const items = range(10)
    const controller = new AbortController()
    const executed: number[] = []

    const result = await batchExecute({
      controller,
      getItems: () => items,
      concurrency,
      execute: async (item) => {
        await wait(10)
        executed.push(item)
        if (item === 4) {
          controller.abort()
        }
        return item
      },
      onProcessed: async () => {},
    })

    expect(executed.length).toBeGreaterThanOrEqual(5)
    expect(executed.length).toBeLessThanOrEqual(7)
    expect(result.success).toBeLessThanOrEqual(7)
  })
})
