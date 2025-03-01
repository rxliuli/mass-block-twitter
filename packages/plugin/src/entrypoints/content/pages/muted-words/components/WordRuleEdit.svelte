<script lang="ts">
  import { CheckboxGroup } from '$lib/components/custom/checkbox'
  import { RadioGroup } from '$lib/components/custom/radio'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import type { MutedWordRule } from '$lib/filter'
  import * as Dialog from '$lib/components/ui/dialog'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { Button } from '$lib/components/ui/button'
  import { createMutation } from '@tanstack/svelte-query'

  let {
    open = $bindable(false),
    rule = $bindable<MutedWordRule>(),
    title,
    onUpdate,
  }: {
    open: boolean
    rule: MutedWordRule
    onUpdate: (rule: MutedWordRule) => void
    title: string
  } = $props()

  const mutation = createMutation({
    mutationFn: async () => {
      onUpdate(rule)
    },
  })

  function onCancel() {
    open = false
  }

  let form = $state<HTMLFormElement>()
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="sm:max-w-[425px]"
    portalProps={{ to: shadcnConfig.get().portal }}
  >
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
    </Dialog.Header>
    <form
      class="flex flex-col gap-4"
      bind:this={form}
      onsubmit={() => $mutation.mutate()}
    >
      <div class="flex flex-col gap-4">
        <Label for="keyword">Keyword</Label>
        <Input id="keyword" bind:value={rule.keyword} />
      </div>
      <div class="flex flex-col gap-4">
        <Label for="type">Type</Label>
        <RadioGroup
          options={[
            { value: 'hide', label: 'Hide' },
            { value: 'block', label: 'Block' },
          ]}
          bind:value={rule.type}
        />
      </div>
      <div class="flex flex-col gap-4">
        <Label for="checkpoints">Checkpoints</Label>
        <CheckboxGroup
          class="flex-col"
          options={[
            { value: 'name', label: 'Name' },
            { value: 'screen_name', label: 'Screen Name' },
            { value: 'description', label: 'Description' },
            { value: 'location', label: 'Location' },
            { value: 'tweet', label: 'Tweet' },
          ]}
          bind:value={() => rule.checkpoints,
          (value) => {
            rule.checkpoints = value
          }}
        />
      </div>
    </form>
    <Dialog.Footer>
      <Button
        type="submit"
        disabled={$mutation.isPending}
        onclick={() => form?.dispatchEvent(new Event('submit'))}
      >
        {$mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
      <Button
        variant="secondary"
        disabled={$mutation.isPending}
        onclick={onCancel}
      >
        Cancel
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
