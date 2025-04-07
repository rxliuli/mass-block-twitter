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
  total: number
  success: number
  failed: number
  results: R[]
}

export async function batchExecute<T, R>(
  options: BatchExecuteOptions<T, R>,
): Promise<BatchExecuteResult<T, R>> {
  let i = 0
  let processed = 0
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
      if (Array.isArray(context.item)) {
        failed += context.item.length
      } else {
        failed++
      }
      context.error = error
    }
    processed += Array.isArray(context.item) ? context.item.length : 1
    const total =
      options.total ??
      (Array.isArray(context.item) ? items.flat().length : items.length)
    const successful = processed - failed
    const averageTime = (Date.now() - startTime) / processed
    const remainingTime = (total - processed) * averageTime
    context.progress = {
      processed,
      total,
      successful,
      failed,
      startTime,
      currentTime: Date.now(),
      averageTime,
      remainingTime,
    }

    await options.onProcessed(context)
  }
  return {
    success: processed - failed,
    failed,
    results,
    total: options.total ?? options.getItems().flat().length,
  } satisfies BatchExecuteResult<T, R>
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
  const startTime = Date.now()
  for (
    let i = 0, failed = 0;
    !options.controller.signal.aborted && options.hasNext();
    i++
  ) {
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
    const averageTime = (Date.now() - startTime) / context.items.length
    context.progress = {
      processed: context.items.length,
      total: options.total ?? context.items.length,
      startTime,
      currentTime: Date.now(),
      averageTime,
      successful: context.items.length,
      failed,
      remainingTime: options.total
        ? (options.total - context.items.length) * averageTime
        : undefined,
    }
    await options.onProcessed(context)
  }
}
