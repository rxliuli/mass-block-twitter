<script lang="ts">
  import { cn } from '$lib/utils'

  const props = $props()
</script>

<div
  class={cn(
    'text-lg font-semibold leading-none tracking-tight py-4',
    props.class,
  )}
>
  {@render props.children?.()}
</div>
