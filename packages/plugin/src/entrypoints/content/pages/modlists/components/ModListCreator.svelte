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
    ModListCreateRequest,
    ModListCreateResponse,
    ModListGetCreatedResponse,
  } from '@mass-block-twitter/server'
  import { SERVER_URL } from '$lib/constants'
  import { PlusIcon } from 'lucide-svelte'
  import { navigate } from '$lib/components/logic/router'
  import { t } from '$lib/i18n'

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
        toast.info($t('modlists.creator.toast.limit.title'), {
          description: $t('modlists.creator.toast.limit.description'),
          action: {
            label: $t('modlists.creator.toast.limit.action'),
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
        throw new Error($t('modlists.creator.error.userId'))
      }
      const twitterUser = await dbApi.users.get(userId)
      if (!twitterUser) {
        throw new Error($t('modlists.creator.error.userNotFound'))
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
          toast.info($t('modlists.creator.toast.login'))
        }
        throw resp
      }
      const r = (await resp.json()) as ModListCreateResponse
      toast.success($t('modlists.creator.toast.success'), {
        description: $t('modlists.creator.toast.success.description'),
      })
      navigate(`/modlists/detail?id=${r.id}`)
    },
    onSuccess: async () => {},
    onError: (resp) => {
      if (resp instanceof Response && resp.status === 401) {
        toast.info($t('modlists.creator.toast.login'))
        return
      }
      if (resp instanceof Error) {
        toast.error(resp.message)
        return
      }
      toast.error($t('modlists.creator.toast.error'))
    },
  })

  const authInfo = useAuthInfo()
</script>

<Button
  variant={'ghost'}
  size={'icon'}
  onclick={onOpenModal}
  disabled={!authInfo.value}
  data-testid="modlist-creator"
>
  <PlusIcon class="w-4 h-4" />
</Button>

<ModListEdit
  bind:open
  title={$t('modlists.creator.title')}
  onSave={$mutation.mutateAsync}
/>
