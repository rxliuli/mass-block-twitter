let controller = new AbortController()

export function useController(): AbortController & {
  create: () => void
} {
  return {
    get signal() {
      return controller.signal
    },
    abort() {
      controller.abort()
    },
    create() {
      controller.abort()
      controller = new AbortController()
    },
  }
}
