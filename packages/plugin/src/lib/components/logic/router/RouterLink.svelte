<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements'
  import { navigate } from './route.svelte'

  const { children, href, ...props }: HTMLAnchorAttributes = $props()
</script>

<a
  {...props}
  {href}
  onclick={(ev) => {
    ev.preventDefault()
    if (href) {
      navigate(href)
    }
  }}
>
  {#if children}
    {@render children()}
  {/if}
</a>
