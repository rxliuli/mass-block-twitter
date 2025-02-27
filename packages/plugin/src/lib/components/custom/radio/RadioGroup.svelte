<script lang="ts">
  import * as RadioGroup from '$lib/components/ui/radio-group'
  import { Label } from '$lib/components/ui/label'
  import type { LabelValue } from '../select/types'

  let {
    value = $bindable<string>(),
    options,
  }: {
    value?: string
    options: LabelValue[]
  } = $props()
</script>

<RadioGroup.Root bind:value class="flex items-center gap-2">
  {#each options as option}
    <Label for={option.value} class="flex items-center cursor-pointer">
      <RadioGroup.Item value={option.value} id={option.value} />
      <span class="px-2">{option.label}</span>
    </Label>
  {/each}
</RadioGroup.Root>
