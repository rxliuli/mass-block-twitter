<script lang="ts">
  import { navigate, RouterLink } from '$lib/components/logic/router'
  import { SERVER_URL } from '$lib/constants'
  import { createQuery } from '@tanstack/svelte-query'
  import type { ModListSearchResponse } from '@mass-block-twitter/server'
  import Button from '$lib/components/ui/button/button.svelte'
  import ModLists from './components/ModLists.svelte'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'

  const query = createQuery({
    queryKey: ['modlists'],
    queryFn: async () => {
      const resp = await fetch(`${SERVER_URL}/api/modlists/search`)
      if (!resp.ok) {
        throw resp
      }
      return (await resp.json()) as ModListSearchResponse
    },
  })

  async function onGotoCreated() {
    const authInfo = await getAuthInfo()
    if (!authInfo) {
      toast.info('Please login to view your created modlists')
      return
    }
    navigate(`/modlists/created?userId=${authInfo.id}`)
  }
  async function onGotoSubscribed() {
    const authInfo = await getAuthInfo()
    if (!authInfo) {
      toast.info('Please login to view your subscribed modlists')
      return
    }
    navigate('/modlists/subscribe')
  }
</script>

<header>
  <nav class="flex gap-2">
    <Button variant="secondary" onclick={onGotoCreated}>Created</Button>
    <Button variant="secondary" onclick={onGotoSubscribed}>Subscribed</Button>
  </nav>
</header>

<ModLists query={$query} />
