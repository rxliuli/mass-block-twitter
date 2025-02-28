<script lang="ts">
  import { navigate, RouterLink } from '$lib/components/logic/router'
  import { SERVER_URL } from '$lib/constants'
  import { createQuery } from '@tanstack/svelte-query'
  import type { ModListSearchResponse } from '@mass-block-twitter/server'
  import Button from '$lib/components/ui/button/button.svelte'
  import ModLists from './components/ModLists.svelte'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'
  import { crossFetch } from '$lib/query'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import ModListCreator from './components/ModListCreator.svelte'

  const query = createQuery({
    queryKey: ['modlists'],
    queryFn: async () => {
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/search`)
      if (!resp.ok) {
        throw resp
      }
      return (await resp.json()) as ModListSearchResponse
    },
  })

  const authInfo = useAuthInfo()
  async function onGotoCreated() {
    if (!authInfo.value) {
      toast.info('Please login to view your created modlists')
      return
    }
    navigate(`/modlists/created`)
  }
  async function onGotoSubscribed() {
    if (!authInfo.value) {
      toast.info('Please login to view your subscribed modlists')
      return
    }
    navigate('/modlists/subscribe')
  }
</script>

<LayoutNav title="Moderation Lists">
  <ModListCreator onCreated={() => $query.refetch()} />
</LayoutNav>

<nav class="flex items-center gap-4">
  <RouterLink class="text-blue-500 cursor-pointer" onclick={onGotoCreated}>
    Created
  </RouterLink>
  <RouterLink class="text-blue-500 cursor-pointer" onclick={onGotoSubscribed}>
    Subscribed
  </RouterLink>
</nav>

<ModLists query={$query} />
