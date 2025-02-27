<script lang="ts">
  import type { RouteConfig } from './route.svelte'
  import { router } from './route.svelte'
  import type { Snippet } from 'svelte'

  function useState<T>(value: T): { value: T } {
    let state = $state(value)
    return {
      get value() {
        return state
      },
      set value(v: T) {
        state = v
      },
    }
  }

  const {
    routes,
    initialPath = '/',
    children,
  }: {
    routes: RouteConfig[]
    initialPath?: string
    children?: Snippet
  } = $props()

  $effect(() => {
    router.routes = routes
    router.path = initialPath
  })
</script>

{@render children?.()}
