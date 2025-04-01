<script lang="ts">
  import { setContext, type Snippet, onMount } from 'svelte'
  import { Selector } from './select'
  import type { MultipleSelectRootContext } from './types'

  let {
    selected = $bindable([]),
    onChange,
    keys,
    children,
  }: {
    selected: string[]
    // disabled warning: https://svelte.dev/docs/svelte/runtime-warnings#Client-warnings-ownership_invalid_binding
    onChange?: (selected: string[]) => void
    keys: string[]
    children: Snippet
  } = $props()

  let selector = $state(new Selector(keys))
  $effect(() => {
    if (JSON.stringify(keys) === JSON.stringify(selector.getKeys())) {
      return
    }
    selector.setKeys(keys)
    selected = selector.selected
  })
  $effect(() => {
    selector.setSelected(selected)
  })
  onMount(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.shiftKey) {
        selector.shiftDown()
        selected = selector.selected
      }
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (!ev.shiftKey) {
        selector.shiftUp()
        selected = selector.selected
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })
  const mode = $derived<MultipleSelectRootContext['mode']>(
    selected.length === 0
      ? 'unchecked'
      : selected.length === keys.length
        ? 'checked'
        : 'indeterminate',
  )

  setContext('MultipleSelectRoot', {
    get selected() {
      return selected
    },
    get mode() {
      return mode
    },
    click: (key: string) => {
      selector.click(key)
      selected = selector.selected
      onChange?.(selected)
    },
    selectAll: () => {
      selector.selectAll()
      selected = selector.selected
      onChange?.(selected)
    },
  } satisfies MultipleSelectRootContext)
</script>

{@render children()}
