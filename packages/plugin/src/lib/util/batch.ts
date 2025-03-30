export type ExecuteOperationContext<T, R> = QueryOperationContext<T> & {
  item: T
  result?: R
}
type BatchExecuteOptions<T, R> = {
  controller: AbortController
  getItems: () => T[]
  onProcessed: (c: ExecuteOperationContext<T, R>) => Promise<void>
  execute: (item: T) => Promise<R>
  total?: number
}
type BatchExecuteResult<T, R> = {
  success: number
  failed: number
  results: R[]
}

export async function batchExecute<T, R>(
  options: BatchExecuteOptions<T, R>,
): Promise<BatchExecuteResult<T, R>> {
  let i = 0
  let failed = 0
  const results: R[] = []
  const startTime = Date.now()
  for (
    ;
    !options.controller.signal.aborted && i < options.getItems().length;
    i++
  ) {
    const items = options.getItems()
    const context = {
      controller: options.controller,
      index: i,
      items: items,
      item: items[i],
    } as ExecuteOperationContext<T, R>
    try {
      const result = await options.execute(context.item)
      context.result = result
      results[i] = result
    } catch (error) {
      failed++
      context.error = error
    }
    const averageTime = (Date.now() - startTime) / (i + 1)
    const total = options.total ?? items.length
    context.progress = {
      processed: i + 1,
      total,
      successful: i + 1 - failed,
      failed,
      startTime,
      currentTime: Date.now(),
      averageTime,
      remainingTime: (total - i - 1) * averageTime,
    }
    await options.onProcessed(context)
  }
  return {
    success: i - failed,
    failed,
    results,
  } as BatchExecuteResult<T, R>
}

export type QueryOperationContext<T> = {
  progress: {
    processed: number
    total: number
    successful: number
    failed: number

    startTime: number
    currentTime: number
    averageTime: number
    remainingTime?: number
  }
  items: T[]
  index: number
  error?: unknown
  controller: AbortController
}

export type BatchQueryOptions<T> = {
  controller: AbortController
  getItems: () => T[]
  onProcessed: (c: QueryOperationContext<T>) => Promise<void>
  fetchNextPage: () => Promise<any>
  hasNext: () => boolean
  total?: number
}

export async function batchQuery<T>(options: BatchQueryOptions<T>) {
  for (
    let i = 0, failed = 0;
    !options.controller.signal.aborted && options.hasNext();
    i++
  ) {
    const startTime = Date.now()
    const context = {
      controller: options.controller,
      index: i,
    } as QueryOperationContext<T>
    try {
      await options.fetchNextPage()
    } catch (error) {
      failed++
      context.error = error
    }
    context.items = options.getItems()
    const averageTime = (Date.now() - startTime) / (i + 1)
    context.progress = {
      processed: i + 1,
      total: options.total ?? options.getItems().length,
      startTime,
      currentTime: Date.now(),
      averageTime,
      successful: i + 1 - failed,
      failed,
      remainingTime: options.total
        ? (options.total - i - 1) * averageTime
        : undefined,
    }
    await options.onProcessed(context)
  }
}
