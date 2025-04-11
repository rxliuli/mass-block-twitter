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
  concurrency?: number
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
  const concurrency = options.concurrency ?? 1
  let processed = 0
  let failed = 0
  const results: R[] = []
  const startTime = Date.now()
  let items = options.getItems()

  // Create a queue to manage concurrent tasks
  const queue = new Set<Promise<void>>()
  let currentIndex = 0

  // Add task to queue
  const addTask = async (index: number) => {
    if (index >= items.length || options.controller.signal.aborted) return

    // Refresh items before execution to support dynamic data
    items = options.getItems()
    if (index >= items.length) return

    const item = items[index]
    const context = {
      controller: options.controller,
      index,
      items,
      item,
    } as ExecuteOperationContext<T, R>

    const task = (async () => {
      const taskStartTime = Date.now()
      try {
        const result = await options.execute(item)
        context.result = result
        results[index] = result
      } catch (error) {
        if (Array.isArray(item)) {
          failed += item.length
        } else {
          failed++
        }
        context.error = error
      }

      // Update progress
      processed += Array.isArray(item) ? item.length : 1
      const successful = processed - failed
      const currentTime = Date.now()
      const elapsedTime = currentTime - startTime
      const averageTime = elapsedTime / processed
      
      // Recalculate total on each task execution
      const total = options.total ?? (Array.isArray(items[0]) ? items.flat().length : items.length)
      
      // Calculate remaining time based on actual execution time
      const remainingItems = total - processed
      const remainingTime = remainingItems * averageTime
      
      context.progress = {
        processed,
        total,
        successful,
        failed,
        startTime,
        currentTime,
        averageTime,
        remainingTime,
      }

      await options.onProcessed(context)
    })()

    queue.add(task)
    task.then(() => {
      queue.delete(task)
      // Add next task if available
      if (currentIndex < items.length) {
        addTask(currentIndex++)
      }
    })
  }

  // Start initial batch of tasks
  while (currentIndex < concurrency && currentIndex < items.length) {
    addTask(currentIndex++)
  }

  // Wait for all tasks to complete
  while (queue.size > 0) {
    await Promise.race(queue)
  }

  // Calculate final total for return value
  const finalTotal = options.total ?? (Array.isArray(items[0]) ? items.flat().length : items.length)
  return {
    success: processed - failed,
    failed,
    results,
    total: finalTotal,
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
