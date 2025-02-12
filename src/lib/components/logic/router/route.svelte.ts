import { type Component } from 'svelte'
import { computed } from './utils/rune.svelte'

export interface RouteConfig {
  path: string
  component: Component | (() => Promise<{ default: Component }>)
}

export const router = $state<{
  path: string
  routes: RouteConfig[]
  history: string[]
}>({
  path: '/',
  routes: [],
  history: [],
})

export function navigate(path: string, replace: boolean = false) {
  if (!replace) {
    router.history.push(router.path)
  } else {
    router.history[router.history.length - 1] = path
  }
  router.path = path
}

export function goBack() {
  if (router.history.length > 0) {
    router.path = router.history.at(-1)!
    router.history = router.history.slice(0, -1)
  }
}

interface Route {
  path: string
  search?: URLSearchParams
  matched?: RouteConfig
}

export function useRoute(): Route {
  return computed(() => {
    const [path, search] = router.path.split('?')
    return {
      path: router.path,
      search: search ? new URLSearchParams(search) : undefined,
      matched: router.routes.find((it) => it.path === path),
    }
  })
}
