<script lang="ts">
  import { shadcnConfig } from '$lib/components/logic/config'
  import * as Select from '$lib/components/ui/select'
  import { cn } from '$lib/utils'
  import type { LabelValue } from './types'

  let {
    value = $bindable(),
    onChange,
    options,
    name,
    placeholder,
    class: className,
    disabled,
    required,
  }: {
    value?: string
    onChange?: (value: string) => void
    options: LabelValue[]
    name?: string
    placeholder?: string
    class?: string
    disabled?: boolean
    required?: boolean
  } = $props()
</script>

<Select.Root
  type="single"
  {name}
  bind:value
  onValueChange={onChange}
  {disabled}
  {required}
>
  <Select.Trigger class={className}>
    <span class="truncate">
      {options.find((it) => it.value === value)?.label ??
        placeholder ??
        'Select a value'}
    </span>
  </Select.Trigger>
  <Select.Content portalProps={{ to: shadcnConfig.get().portal }}>
    {#each options as option}
      <Select.Item value={option.value}>
        {option.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
