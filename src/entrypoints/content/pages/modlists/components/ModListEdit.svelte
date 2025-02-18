<script lang="ts">
  import { shadcnConfig } from '$lib/components/logic/config'
  import * as Avatar from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { FileReader } from '$lib/util/FileReader'
  import type { ModList } from '@mass-block-twitter/server'
  import { createMutation } from '@tanstack/svelte-query'
  import { UserRoundIcon } from 'lucide-svelte'
  import { untrack } from 'svelte'
  import * as RadioGroup from '$lib/components/ui/radio-group'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'

  type FormData = Pick<
    ModList,
    'name' | 'description' | 'avatar' | 'visibility'
  >

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
    visibility: props.data?.visibility ?? 'public',
  })
  let form = $state<HTMLFormElement>()
  $effect(() => {
    if (open) {
      untrack(() => {
        Object.assign(formState, props.data)
        formState.visibility = props.data?.visibility ?? 'public'
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
      const formData = new FormData(form)
      formState.visibility = formData.get('visibility') as ModList['visibility']
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

  const authInfo = useAuthInfo()
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
        <Label for="avatar" class="block mb-2">List Avatar</Label>
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
        <Label for="name" class="block mb-2">List Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Spammers"
          bind:value={formState.name}
          required
        />
      </div>
      <div>
        <Label for="description" class="block mb-2">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="e.g. Users that repeatedly reply with ads."
          rows={4}
          bind:value={formState.description}
        />
      </div>
      <div class={authInfo.value?.isPro ? 'block' : 'hidden'}>
        <Label for="visibility" class="block mb-2">Visibility</Label>
        <RadioGroup.Root
          id="visibility"
          name="visibility"
          bind:value={formState.visibility}
          class="flex gap-2"
        >
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="public" id="visibility-public" />
            <Label for="visibility-public">Public</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="protected" id="visibility-protected" />
            <Label for="visibility-protected">Protected</Label>
          </div>
        </RadioGroup.Root>
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
