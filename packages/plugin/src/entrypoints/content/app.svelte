<script lang="ts">
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import SearchBlockPage from './pages/search-and-block/page.svelte'
  import BlockedUsersPage from './pages/search-and-block/blocked/page.svelte'
  import ModListsPage from './pages/modlists/page.svelte'
  import MutedWordsPage from './pages/muted-words/page.svelte'
  import SettingsPage from './pages/settings/page.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher, mode } from 'mode-watcher'
  import {
    type RouteConfig,
    Router,
    RouterView,
  } from '$lib/components/logic/router'
  import AppLayout from '$lib/components/layout/AppLayout.svelte'
  import { Button } from '$lib/components/ui/button'
  import { XIcon } from 'lucide-svelte'
  import { ShadcnConfig } from '$lib/components/logic/config'
  import ModListsCreatedPage from './pages/modlists/created/page.svelte'
  import ModListsSubscribePage from './pages/modlists/subscribe/page.svelte'
  import ModListsDetailPage from './pages/modlists/detail/page.svelte'
  import DashboardPage from './pages/dashboard/page.svelte'
  import SettingsAppearancePage from './pages/settings/appearance/page.svelte'
  import SettingsFilterPage from './pages/settings/filter/page.svelte'
  import SettingsPrivacyPage from './pages/settings/privacy/page.svelte'
  import DashboardActivitiesPage from './pages/dashboard/activities/page.svelte'
  import AppNotifications from '$lib/components/layout/AppNotifications.svelte'
  import SettingsLanguagesPage from './pages/settings/languages/page.svelte'
  import { FloatingButton } from '$lib/components/logic/floating'
  import { useOpen } from '$lib/stores/open.svelte'
  import SettingsBlockPage from './pages/settings/block/page.svelte'
  import DevPage from './pages/dev/page.svelte'

  let { initialPath }: { initialPath?: string } = $props()

  let openState = useOpen(!!initialPath)

  onMount(() => {
    onMessage('show', () => {
      openState.openModal()
    })
    return removeAllListeners
  })

  const queryClient = new QueryClient()
  const root = document
    .querySelector('mass-block-twitter')
    ?.shadowRoot?.querySelector('body')!

  // TODO https://github.com/svecosystem/mode-watcher/issues/104
  $effect(() => {
    const current = $mode
    if (root) {
      root.className = `color-scheme: ${current}`
    }
  })

  const routes: RouteConfig[] = [
    {
      path: '/',
      component: DashboardPage,
    },
    {
      path: '/dashboard/activities',
      component: DashboardActivitiesPage,
    },
    {
      path: '/search-and-block',
      component: SearchBlockPage,
    },
    {
      path: '/search-and-block/blocked-users',
      component: BlockedUsersPage,
    },
    {
      path: '/muted-words',
      component: MutedWordsPage,
    },
    {
      path: '/modlists',
      component: ModListsPage,
    },
    {
      path: '/modlists/created',
      component: ModListsCreatedPage,
    },
    {
      path: '/modlists/subscribe',
      component: ModListsSubscribePage,
    },
    {
      path: '/modlists/detail',
      component: ModListsDetailPage,
    },
    {
      path: '/settings',
      component: SettingsPage,
    },
    {
      path: '/settings/appearance',
      component: SettingsAppearancePage,
    },
    {
      path: '/settings/filter',
      component: SettingsFilterPage,
    },
    {
      path: '/settings/privacy',
      component: SettingsPrivacyPage,
    },
    {
      path: '/settings/languages',
      component: SettingsLanguagesPage,
    },
    {
      path: '/settings/block',
      component: SettingsBlockPage,
    },
    {
      path: '/dev',
      component: DevPage,
    },
  ]
</script>

<QueryClientProvider client={queryClient}>
  <ShadcnConfig portal={root}>
    <FloatingButton />

    <Router
      initialPath={import.meta.env.VITE_INITIAL_PATH ?? initialPath}
      {routes}
    >
      {#if openState.opened}
        <AppLayout open={openState.open}>
          <RouterView />
          <Button
            variant="ghost"
            size="icon"
            class="absolute top-0 right-0"
            onclick={openState.closeModal}
          >
            <XIcon class="w-4 h-4" />
          </Button>
        </AppLayout>
      {/if}
    </Router>
  </ShadcnConfig>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors closeButton expand />
<AppNotifications />
