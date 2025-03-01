import { type Component } from 'svelte'

interface AsyncComponent {
  loader: () => Promise<{ default: Component }>
  loadingComponent?: Component
  errorComponent?: Component
}

interface AsyncComponentOptions {
  loader: () => Promise<{ default: Component }>
  loadingComponent?: Component
  errorComponent?: Component
}

export function defineAsyncComponent(
  source: (() => Promise<{ default: Component }>) | AsyncComponentOptions,
): AsyncComponent {
  if (typeof source === 'function') {
    return {
      loader: source,
    }
  }
  return source
}

export interface RouteConfig {
  path: string
  component: Component | AsyncComponent
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
  return {
    get path() {
      return router.path
    },
    get search() {
      const [, search] = router.path.split('?')
      return search ? new URLSearchParams(search) : undefined
    },
    get matched() {
      const [path] = router.path.split('?')
      return router.routes.find((it) => it.path === path)
    },
  }
}
