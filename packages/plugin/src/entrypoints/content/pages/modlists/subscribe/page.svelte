<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { createQuery } from '@tanstack/svelte-query'
  import ModLists from '../components/ModLists.svelte'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { SERVER_URL } from '$lib/constants'
  import type { ModListSubscribeResponse } from '@mass-block-twitter/server'
  import { crossFetch } from '$lib/query'
  import * as localModlistSubscriptions from '$lib/localModlistSubscriptions'
  import { t } from '$lib/i18n'

  const query = createQuery({
    queryKey: ['modlists', 'subscribed'],
    networkMode: 'online',
    queryFn: async (): Promise<ModListSubscribeResponse> => {
      const authInfo = await getAuthInfo()
      if (!authInfo) {
        const localSubs = await localModlistSubscriptions.getAllSubscriptions()
        const modListIds = Object.keys(localSubs)
        const modLists = await Promise.all(
          modListIds.map(async (modListId) => {
            const resp = await fetch(`${SERVER_URL}/api/modlists/get/${modListId}`)
            if (resp.ok) {
              const metadata = await resp.json()
              return { ...metadata, action: localSubs[modListId] }
            }
            return null
          })
        )
        return modLists.filter(Boolean)
      }
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/subscribed/metadata`, {
        headers: {
          Authorization: `Bearer ${authInfo.token}`,
        },
      })
      return (await resp.json()) as ModListSubscribeResponse
    },
  })
</script>

<LayoutNav title={$t('modlists.subscribed.title')} />

<ModLists query={$query} />
