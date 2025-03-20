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
  import { t } from '$lib/i18n'

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
        <Label for="keyword">{$t('muted-words.form.keyword.label')}</Label>
        <Input id="keyword" bind:value={rule.keyword} />
      </div>
      <div class="flex flex-col gap-4">
        <Label for="type">{$t('muted-words.form.type.label')}</Label>
        <RadioGroup
          options={[
            { value: 'hide', label: $t('muted-words.form.type.hide') },
            { value: 'block', label: $t('muted-words.form.type.block') },
          ]}
          bind:value={rule.type}
        />
      </div>
      <div class="flex flex-col gap-4">
        <Label for="checkpoints">{$t('muted-words.form.checkpoints.label')}</Label>
        <CheckboxGroup
          class="flex-col"
          options={[
            { value: 'name', label: $t('muted-words.form.checkpoints.name') },
            { value: 'screen_name', label: $t('muted-words.form.checkpoints.screenName') },
            { value: 'description', label: $t('muted-words.form.checkpoints.description') },
            { value: 'location', label: $t('muted-words.form.checkpoints.location') },
            { value: 'tweet', label: $t('muted-words.form.checkpoints.tweet') },
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
        {$mutation.isPending ? $t('muted-words.form.actions.saving') : $t('muted-words.form.actions.save')}
      </Button>
      <Button
        variant="secondary"
        disabled={$mutation.isPending}
        onclick={onCancel}
      >
        {$t('muted-words.form.actions.cancel')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
