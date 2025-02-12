<svelte:options runes={true} />

<script lang="ts">
  import { useRoute } from './route.svelte'

  const route = useRoute()
</script>

{#if route.matched}
  {#if typeof route.matched.component === 'function'}
    <route.matched.component />
  {:else}
    {@const comp = route.matched.component}
    {#await comp.loader()}
      {#if comp.loadingComponent}
        <comp.loadingComponent />
      {:else}
        <div>Loading...</div>
      {/if}
    {:then c}
      <c.default />
    {:catch error}
      {#if comp.errorComponent}
        <comp.errorComponent />
      {:else}
        <div>Error: {String(error)}</div>
      {/if}
    {/await}
  {/if}
{:else}
  <div>404 Not Found</div>
{/if}
