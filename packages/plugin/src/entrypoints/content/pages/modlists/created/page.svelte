<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { createQuery } from '@tanstack/svelte-query'
  import type { ModListGetCreatedResponse } from '@mass-block-twitter/server'
  import ModLists from '../components/ModLists.svelte'
  import { SERVER_URL } from '$lib/constants'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { crossFetch } from '$lib/query'
  import ModListCreator from '../components/ModListCreator.svelte'

  const query = createQuery({
    queryKey: ['modlists', 'created'],
    queryFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/created`, {
        headers: {
          Authorization: `Bearer ${authInfo?.token}`,
        },
      })
      return (await resp.json()) as ModListGetCreatedResponse
    },
  })
</script>

<LayoutNav title="My Moderation Lists">
  <ModListCreator onCreated={() => $query.refetch()} />
</LayoutNav>

<ModLists query={$query} />
