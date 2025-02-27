export function useLoading() {
  let loadings = $state<Record<string, boolean>>({})
  function withLoading<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    id: (...args: Parameters<T>) => string,
  ): T {
    return (async (...args) => {
      loadings[id(...(args as Parameters<T>))] = true
      try {
        return await fn(...args)
      } finally {
        loadings[id(...(args as Parameters<T>))] = false
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
