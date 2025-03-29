let globalLoading = $state<Record<string, boolean>>({})

export function useLoading<T extends Record<string, boolean>>(
  global?: boolean,
): {
  loadings: T
  withLoading<F extends (...args: any[]) => Promise<any>>(
    fn: F,
    id: (...args: Parameters<F>) => (keyof T & string) | (keyof T & string)[],
  ): F
} {
  let localLoading = $state<Record<string, boolean>>({})
  let loadings = global ? globalLoading : localLoading
  function withLoading<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    id: (...args: Parameters<T>) => string | string[],
  ): T {
    return (async (...args) => {
      const ids = id(...(args as Parameters<T>))
      const idArray = Array.isArray(ids) ? ids : [ids]
      idArray.forEach((it) => {
        loadings[it] = true
      })
      try {
        return await fn(...args)
      } finally {
        idArray.forEach((it) => {
          loadings[it] = false
        })
      }
    }) as T
  }
  return {
    get loadings() {
      return loadings as T
    },
    withLoading,
  }
}
