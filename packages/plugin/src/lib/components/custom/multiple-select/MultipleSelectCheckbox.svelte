<script lang="ts">
  import { type Snippet, getContext, tick } from 'svelte'
  import type { MultipleSelectRootContext } from './types'

  let {
    key,
    child,
  }: {
    key: string
    child: Snippet<
      [
        {
          checked: boolean
          onclick: (ev: MouseEvent) => void
        },
      ]
    >
  } = $props()
  const context = getContext<MultipleSelectRootContext>('MultipleSelectRoot')
  const checked = $derived.by(() => context.selected.includes(key))
</script>

{@render child({
  checked,
  onclick: async (ev) => {
    ev.preventDefault()
    await tick()
    context.click(key)
  },
})}
