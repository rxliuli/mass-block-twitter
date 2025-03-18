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
    ModListGetCreatedResponse,
  } from '@mass-block-twitter/server'
  import { SERVER_URL } from '$lib/constants'
  import { PlusIcon } from 'lucide-svelte'
  import { navigate } from '$lib/components/logic/router'

  let open = $state(false)
  async function onOpenModal() {
    const authInfo = await getAuthInfo()
    if (!authInfo?.isPro) {
      const created = (await (
        await crossFetch(`${SERVER_URL}/api/modlists/created`, {
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        })
      ).json()) as ModListGetCreatedResponse
      if (created.length >= 3) {
        toast.info('You have reached the maximum number of moderation lists.', {
          description:
            'Please upgrade to Pro to create unlimited moderation lists.',
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              window.open('https://mass-block-twitter.rxliuli.com/pricing')
            },
          },
        })
        return
      }
    }

    open = true
  }

  const mutation = createMutation({
    mutationFn: async (modList: Omit<ModListCreateRequest, 'twitterUser'>) => {
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
          ...modList,
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
      const r = (await resp.json()) as ModListCreateResponse
      toast.success('Modlist created')
      navigate(`/modlists/detail?id=${r.id}`)
    },
    onSuccess: async () => {},
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

<Button
  variant={'ghost'}
  size={'icon'}
  onclick={onOpenModal}
  disabled={!authInfo.value}
>
  <PlusIcon class="w-4 h-4" />
</Button>

<ModListEdit
  bind:open
  title="New Moderation List"
  onSave={$mutation.mutateAsync}
/>
