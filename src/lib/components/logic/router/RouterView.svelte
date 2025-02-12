<svelte:options runes={true} />

<script lang="ts">
  import { isComponent } from './utils/isComponent'
  import { useRoute } from './route.svelte'

  const route = useRoute()
</script>

{#if route.matched}
  {#if isComponent(route.matched.component)}
    <route.matched.component />
  {:else}
    {#await route.matched.component()}
      <div>Loading...</div>
    {:then c}
      <c.default />
    {:catch error}
      <div>Error: {error.message}</div>
    {/await}
  {/if}
{:else}
  <div>404 Not Found</div>
{/if}
