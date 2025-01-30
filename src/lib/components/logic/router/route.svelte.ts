import { type Component } from 'svelte'

export interface Route {
  path: string
  component: Component
}

export const router = $state<{
  path: string
  routes: Route[]
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
