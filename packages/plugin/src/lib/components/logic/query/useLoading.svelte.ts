export function useLoading() {
  let loadings = $state<Record<string, boolean>>({})
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
      return loadings
    },
    withLoading,
  }
}
