<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import ModListEdit from './ModListEdit.svelte'
  import { createMutation } from '@tanstack/svelte-query'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { extractCurrentUserId } from '$lib/observe'
  import { dbApi } from '$lib/db'
  import { crossFetch } from '$lib/query'
  import { toast } from 'svelte-sonner'
  import type {
    ModList,
    ModListCreateRequest,
    ModListCreateResponse,
  } from '@mass-block-twitter/server'
  import { SERVER_URL } from '$lib/constants'

  const props: {
    onCreated: (modList: ModListCreateResponse) => void
  } = $props()

  let open = $state(false)
  async function onOpenModal() {
    open = true
  }

  const mutation = createMutation({
    mutationFn: async (
      modList: Pick<ModList, 'name' | 'description' | 'avatar'>,
    ) => {
      const authInfo = await getAuthInfo()
      const userId = extractCurrentUserId()
      if (!userId) {
        throw new Error('Twitter User ID not found, please login again.')
      }
      const twitterUser = await dbApi.users.get(userId)
      if (!twitterUser) {
        throw new Error('User not found, please login again.')
      }
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/create`, {
        method: 'POST',
        body: JSON.stringify({
          name: modList.name,
          description: modList.description!,
          avatar: modList.avatar!,
          twitterUser,
        } satisfies ModListCreateRequest),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authInfo?.token}`,
        },
      })
      if (!resp.ok) {
        if (resp.status === 401) {
          toast.info('Please login to create a Moderation List!')
        }
        throw resp
      }
      props.onCreated?.((await resp.json()) as ModListCreateResponse)
    },
    onSuccess: async () => {
      toast.success('Modlist created')
    },
    onError: (resp) => {
      if (resp instanceof Response && resp.status === 401) {
        toast.info('Please login to create a Moderation List!')
        return
      }
      if (resp instanceof Error) {
        toast.error(resp.message)
        return
      }
      toast.error('Failed to create modlist')
    },
  })

  const authInfo = useAuthInfo()
</script>

<Button onclick={onOpenModal} disabled={!authInfo.value}>Create</Button>

<ModListEdit
  bind:open
  title="New Moderation List"
  onSave={$mutation.mutateAsync}
/>
