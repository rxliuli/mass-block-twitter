<script lang="ts">
  import { Context } from 'runed'
  import { Snippet } from 'svelte'
  import { shadcnConfig } from './context'

  const props: { children?: Snippet; portal?: HTMLElement } = $props()

  shadcnConfig.set({
    portal: props.portal,
  })
</script>

{@render props.children?.()}
