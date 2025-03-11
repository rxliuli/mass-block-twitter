let open = $state(false)

export function useSidebar() {
  return {
    get open() {
      return open
    },
    toggle(value?: boolean) {
      open = value ?? !open
    },
  }
}
