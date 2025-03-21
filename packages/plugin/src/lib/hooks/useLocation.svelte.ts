import { onDestroy } from 'svelte'

let url = $state<URL | undefined>(
  typeof location !== 'undefined' ? new URL(location.href) : undefined,
)

export function useLocation() {
  const interval = setInterval(() => {
    if (typeof location !== 'undefined' && url?.href !== location.href) {
      url = new URL(location.href)
    }
  }, 1000)
  onDestroy(() => clearInterval(interval))
  return {
    get url() {
      return url
    },
  }
}
