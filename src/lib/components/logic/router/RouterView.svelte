<script lang="ts">
  import { router } from './route.svelte'

  const route = $derived(
    router.routes.find((route) => route.path === router.path),
  )
</script>

{#if route}
  <route.component />
{:else}
  <div>404 Not Found</div>
{/if}
