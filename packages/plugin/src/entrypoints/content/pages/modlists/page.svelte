<script lang="ts">
  import { navigate, RouterLink } from '$lib/components/logic/router'
  import { SERVER_URL } from '$lib/constants'
  import { createQuery } from '@tanstack/svelte-query'
  import type { ModListSearchResponse } from '@mass-block-twitter/server'
  import ModLists from './components/ModLists.svelte'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'
  import { crossFetch } from '$lib/query'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import ModListCreator from './components/ModListCreator.svelte'
  import { t } from '$lib/i18n'

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
      toast.info($t('modlists.toast.login.created'))
      return
    }
    navigate(`/modlists/created`)
  }
  async function onGotoSubscribed() {
    if (!authInfo.value) {
      toast.info($t('modlists.toast.login.subscribed'))
      return
    }
    navigate('/modlists/subscribe')
  }
</script>

<LayoutNav title={$t('modlists.title')}>
  <ModListCreator />
</LayoutNav>

<nav class="flex items-center gap-4">
  <RouterLink class="text-blue-500 cursor-pointer" onclick={onGotoCreated}>
    {$t('modlists.nav.created')}
  </RouterLink>
  <RouterLink class="text-blue-500 cursor-pointer" onclick={onGotoSubscribed}>
    {$t('modlists.nav.subscribed')}
  </RouterLink>
</nav>

<ModLists query={$query} />
