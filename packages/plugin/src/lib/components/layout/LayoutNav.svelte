<script lang="ts">
  import { shadcnConfig } from '$lib/components/logic/config'
  import { Portal } from 'bits-ui'
  import { type Snippet } from 'svelte'

  const props: {
    children?: Snippet
    title?: string
  } = $props()

  onMount(() => {
    if (!props.title) {
      return
    }
    const c = getContext<{ setTitle: (val?: string) => void }>('GlobalState')
    c.setTitle(props.title)
    return () => c.setTitle()
  })
</script>

{#if props.children}
  <Portal
    to={shadcnConfig
      .get()
      .portal?.querySelector('#layout-nav-extra') as HTMLElement}
  >
    {@render props.children()}
  </Portal>
{/if}
