<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    value = $bindable(),
    ...rest
  }: { value: string } & HTMLInputAttributes = $props()
</script>

<input bind:value {...rest} />
