<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import type { Snippet } from 'svelte'
  import MediaQuery from './MediaQuery.svelte'

  const props = $props<{
    icon: Snippet
    text: string
    onclick: () => void
  }>()
</script>

<MediaQuery query="(max-width: 768px)">
  {#snippet children(matches)}
    <!-- {#if matches} -->
    <Button
      onclick={props.onclick}
      variant={'outline'}
      size={'icon'}
      title={props.text}
    >
      {@render props.icon()}
    </Button>
    <!-- {:else}
      <Button onclick={props.onclick}>
        {@render props.icon()}
        {props.text}
      </Button>
    {/if} -->
  {/snippet}
</MediaQuery>
