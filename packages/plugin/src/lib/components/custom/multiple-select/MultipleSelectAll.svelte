<script lang="ts">
  import type { MultipleSelectRootContext } from './types'
  import { getContext, type Snippet } from 'svelte'

  let {
    child,
  }: {
    child: Snippet<
      [{ mode: MultipleSelectRootContext['mode']; onclick: () => void }]
    >
  } = $props()
  const context = getContext<MultipleSelectRootContext>('MultipleSelectRoot')
</script>

{@render child({ mode: context.mode, onclick: () => context.selectAll() })}
