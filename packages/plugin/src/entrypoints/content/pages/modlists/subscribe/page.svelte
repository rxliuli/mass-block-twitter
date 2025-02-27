<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { createQuery } from '@tanstack/svelte-query'
  import ModLists from '../components/ModLists.svelte'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { SERVER_URL } from '$lib/constants'
  import type { ModListSubscribeResponse } from '@mass-block-twitter/server'
  import { crossFetch } from '$lib/query'

  const query = createQuery({
    queryKey: ['modlists', 'subscribed'],
    queryFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/subscribed`, {
        headers: {
          Authorization: `Bearer ${authInfo?.token}`,
        },
      })
      return (await resp.json()) as ModListSubscribeResponse
    },
  })
</script>

<LayoutNav title="Subscribed Moderation Lists" />

<ModLists query={$query} />
