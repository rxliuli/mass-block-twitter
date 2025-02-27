<script lang="ts">
  import * as Select from '$lib/components/ui/select'
  import { Label } from '$lib/components/ui/label'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { cn } from '$lib/utils'
  import { type LabelValue } from './SelectFilter.types'

  let {
    options,
    value = $bindable(),
    label,
    class: className,
  }: {
    options: LabelValue[]
    value: string
    label: string
    class?: string
  } = $props()
</script>

<Label class="flex items-center gap-2">
  <span>{label}</span>
  <Select.Root type="single" bind:value>
    <Select.Trigger class={cn('w-24 h-6 truncate', className)}>
      {options.find((it) => it.value === value)?.label}
    </Select.Trigger>
    <Select.Content
      portalProps={{
        to: shadcnConfig.get().portal,
      }}
    >
      {#each options as option}
        <Select.Item value={option.value} label={option.label} />
      {/each}
    </Select.Content>
  </Select.Root>
</Label>
