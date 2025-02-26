<script lang="ts">
  import { Checkbox } from '$lib/components/ui/checkbox'
  import Label from '$lib/components/ui/label/label.svelte'
  import type { LabelValue } from '../select/types'

  let {
    value = $bindable<string[]>([]),
    options,
    class: className,
  }: {
    value?: string[]
    options: LabelValue[]
    class?: string
  } = $props()
</script>

<div class="flex gap-2 {className}">
  {#each options as option}
    <Label class="flex items-center cursor-pointer">
      <Checkbox
        checked={value.includes(option.value)}
        onCheckedChange={() => {
          value = value.includes(option.value)
            ? value.filter((v) => v !== option.value)
            : [...value, option.value]
        }}
      />
      <span class="px-2">{option.label}</span>
    </Label>
  {/each}
</div>
