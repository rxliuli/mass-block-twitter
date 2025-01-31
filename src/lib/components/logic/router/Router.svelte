<script lang="ts">
  import type { Route } from './types'
  import { router } from './route.svelte'
  import type { Snippet } from 'svelte'

  const {
    routes,
    initialPath = '/',
    children,
  }: {
    routes: Route[]
    initialPath?: string
    children?: Snippet
  } = $props()

  $effect(() => {
    router.routes = routes
    router.path = initialPath
  })
</script>

{@render children?.()}
