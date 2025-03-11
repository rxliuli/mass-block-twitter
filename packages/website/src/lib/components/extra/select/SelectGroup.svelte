<script lang="ts">
  import * as Select from '$lib/components/ui/select'
  import type { Snippet } from 'svelte'
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
    placeholder?: string | Snippet
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
      {#if placeholder}
        {#if typeof placeholder === 'string'}
          {placeholder}
        {:else}
          {@render placeholder()}
        {/if}
      {:else}
        {options.find((it) => it.value === value)?.label ?? 'Select a value'}
      {/if}
    </span>
  </Select.Trigger>
  <Select.Content>
    {#each options as option}
      <Select.Item value={option.value}>
        {option.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
