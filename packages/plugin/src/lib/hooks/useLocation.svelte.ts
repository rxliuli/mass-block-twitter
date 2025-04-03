import { onDestroy } from 'svelte'

export function useLocation() {
  let url = $state<URL>(new URL(location.href))
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
