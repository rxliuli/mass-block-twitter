<script lang="ts">
  import {
    Checkbox as CheckboxPrimitive,
    type WithoutChildrenOrChild,
  } from 'bits-ui'
  import { Checkbox } from '$lib/components/ui/checkbox'

  let {
    ref = $bindable(null),
    checked = $bindable<'checked' | 'unchecked' | 'indeterminate'>('checked'),
    onclick,
    ...props
  }: Omit<WithoutChildrenOrChild<CheckboxPrimitive.RootProps>, 'checked'> & {
    checked?: 'checked' | 'unchecked' | 'indeterminate'
  } = $props()

  const indeterminate = $derived(checked === 'indeterminate')
  const _checked = $derived(checked !== 'unchecked')
</script>

<Checkbox
  checked={_checked}
  onclick={(ev) => {
    ev.preventDefault()
    onclick?.(ev)
  }}
  onCheckedChange={(e) => {
    checked = e ? 'checked' : 'unchecked'
  }}
  {indeterminate}
  {...props}
  bind:ref
/>
