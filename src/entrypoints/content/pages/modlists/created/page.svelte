<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { useRoute } from '$lib/components/logic/router'
  import { Button } from '$lib/components/ui/button'
  import { fakerZH_CN as faker } from '@faker-js/faker'
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'
  import type {
    ModList,
    ModListCreateRequest,
    ModListGetCreatedResponse,
  } from 'packages/mass-block-twitter-server/src/lib'
  import ModLists from '../components/ModLists.svelte'
  import ModListEdit from '../components/ModListEdit.svelte'
  import { SERVER_URL } from '$lib/constants'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo'
  import { extractCurrentUserId } from '$lib/observe'
  import { dbApi } from '$lib/db'

  const query = createQuery({
    queryKey: ['modlists'],
    queryFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await fetch(`${SERVER_URL}/api/modlists/created`, {
        headers: {
          Authorization: `Bearer ${authInfo?.token}`,
        },
      })
      return (await resp.json()) as ModListGetCreatedResponse
    },
  })

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
      const resp = await fetch(`${SERVER_URL}/api/modlists/create`, {
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
    },
    onSuccess: async () => {
      toast.success('Modlist created')
      await $query.refetch()
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
</script>

<LayoutNav title="My Moderation Lists">
  <Button onclick={onOpenModal}>Create</Button>
</LayoutNav>

<ModLists query={$query} />

<ModListEdit
  bind:open
  title="New Moderation List"
  onSave={$mutation.mutateAsync}
/>
