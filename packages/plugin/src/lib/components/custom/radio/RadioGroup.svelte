<script lang="ts">
  import * as RadioGroup from '$lib/components/ui/radio-group'
  import { Label } from '$lib/components/ui/label'
  import type { LabelValue } from '../select/types'

  let {
    value = $bindable<string>(),
    options,
    onChange,
    ...props
  }: {
    value?: string
    options: LabelValue[]
    onChange?: (value: string) => void
    id?: string
  } = $props()
</script>

<RadioGroup.Root
  bind:value
  onValueChange={onChange}
  class="flex items-center gap-2"
  {...props}
>
  {#each options as option}
    <Label for={option.value} class="flex items-center cursor-pointer">
      <RadioGroup.Item value={option.value} id={option.value} />
      <span class="px-2">{option.label}</span>
    </Label>
  {/each}
</RadioGroup.Root>
