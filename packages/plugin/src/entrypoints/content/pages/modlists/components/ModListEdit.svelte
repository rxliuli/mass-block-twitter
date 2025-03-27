<script lang="ts">
  import { shadcnConfig } from '$lib/components/logic/config'
  import * as Avatar from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { FileReader } from '$lib/util/FileReader'
  import type { ModListCreateRequest } from '@mass-block-twitter/server'
  import { createMutation } from '@tanstack/svelte-query'
  import { UserRoundIcon } from 'lucide-svelte'
  import { untrack } from 'svelte'
  import { t } from '$lib/i18n'
  import RadioGroup from '$lib/components/custom/radio/RadioGroup.svelte'

  type FormData = Omit<ModListCreateRequest, 'twitterUser'>

  let {
    open = $bindable(false),
    ...props
  }: {
    open: boolean
    title: string
    data?: FormData
    onSave: (modList: FormData) => Promise<void>
  } = $props()

  let formState = $state<FormData>({
    name: props.data?.name!,
    description: props.data?.description!,
    avatar: props.data?.avatar!,
    visibility: props.data?.visibility ?? 'protected',
  })
  let form = $state<HTMLFormElement>()
  $effect(() => {
    if (open) {
      untrack(() => {
        Object.assign(formState, props.data)
        formState.visibility = props.data?.visibility ?? 'protected'
      })
    }
  })

  const mutation = createMutation({
    mutationFn: async (event: SubmitEvent) => {
      event.preventDefault()
      if (!form?.checkValidity()) {
        form?.reportValidity()
        return
      }
      await props.onSave($state.snapshot(formState))
      onCancel()
    },
  })

  function onCancel() {
    $mutation.reset()
    form?.reset()
    open = false
  }

  let fileInput = $state<HTMLInputElement>()
  function onUploadImage() {
    fileInput?.click()
  }

  async function onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader(file)
      formState.avatar = await reader.readAsDataURL()
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="sm:max-w-[425px]"
    portalProps={{ to: shadcnConfig.get().portal }}
  >
    <Dialog.Header>
      <Dialog.Title>{props.title}</Dialog.Title>
    </Dialog.Header>
    <form
      class="grid gap-4 py-4"
      bind:this={form}
      onsubmit={(ev) => $mutation.mutate(ev)}
    >
      <div>
        <Label for="avatar" class="block mb-2"
          >{$t('modlists.edit.form.avatar.label')}</Label
        >
        <Avatar.Root onclick={onUploadImage} class="w-24 h-24 cursor-pointer">
          <Avatar.Image src={formState.avatar} />
          <Avatar.Fallback>
            <UserRoundIcon />
          </Avatar.Fallback>
        </Avatar.Root>
        <input
          bind:this={fileInput}
          onchange={onFileChange}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          class="hidden"
        />
      </div>
      <div>
        <Label for="name" class="block mb-2"
          >{$t('modlists.edit.form.name.label')}</Label
        >
        <Input
          id="name"
          name="name"
          placeholder={$t('modlists.edit.form.name.placeholder')}
          bind:value={formState.name}
          required
        />
      </div>
      <div>
        <Label for="description" class="block mb-2"
          >{$t('modlists.edit.form.description.label')}</Label
        >
        <Textarea
          id="description"
          name="description"
          placeholder={$t('modlists.edit.form.description.placeholder')}
          rows={4}
          bind:value={formState.description}
        />
      </div>
      <div>
        <Label for="visibility" class="block mb-2"
          >{$t('modlists.edit.form.visibility.label')}</Label
        >
        <RadioGroup
          bind:value={formState.visibility}
          id="visibility"
          options={[
            {
              label: $t('modlists.edit.form.visibility.protected'),
              value: 'protected',
            },
            {
              label: $t('modlists.edit.form.visibility.public'),
              value: 'public',
            },
          ]}
        />
      </div>
    </form>
    <Dialog.Footer>
      <Button
        type="submit"
        disabled={$mutation.isPending}
        onclick={() => form?.dispatchEvent(new Event('submit'))}
      >
        {$mutation.isPending
          ? $t('modlists.edit.form.actions.saving')
          : $t('modlists.edit.form.actions.save')}
      </Button>
      <Button
        variant="secondary"
        disabled={$mutation.isPending}
        onclick={onCancel}
      >
        {$t('modlists.edit.form.actions.cancel')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
