<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { debounce } from 'es-toolkit'

  let {
    value = $bindable(),
    onchange,
    ...rest
  }: {
    value: string
    onchange?: (value: string) => void
    class?: string
    id?: string
    title?: string
  } = $props()

  let isCompositionOn = $state(false)

  const onInput = debounce(() => {
    if (isCompositionOn) {
      return
    }
    onchange?.(value)
  }, 500)
</script>

<Input
  bind:value
  oninput={onInput}
  oncompositionstart={() => (isCompositionOn = true)}
  oncompositionend={() => (isCompositionOn = false)}
  {...rest}
/>
