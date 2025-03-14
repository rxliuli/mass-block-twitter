<script lang="ts">
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import SearchBlockPage from './pages/users/page.svelte'
  import BlockedUsersPage from './pages/users/blocked/page.svelte'
  import ModListsPage from './pages/modlists/page.svelte'
  import MutedWordsPage from './pages/muted-words/page.svelte'
  import SettingsPage from './pages/settings/page.svelte'
  import ProPage from './pages/pro/page.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher, mode } from 'mode-watcher'
  import { Router, RouterView } from '$lib/components/logic/router'
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

  let open = $state(true)

  function lockScroll() {
    document.documentElement.style.overflowY = 'hidden'
    document.documentElement.style.marginRight = '0px'
  }

  function unlockScroll() {
    document.documentElement.style.overflowY = 'scroll'
    document.documentElement.style.marginRight = ''
  }

  $effect(() => {
    if (open) {
      lockScroll()
    } else {
      unlockScroll()
    }
  })

  function openModal() {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${scrollbarWidth}px`,
    )
    document.documentElement.classList.add('modal-open')
  }

  function closeModal() {
    document.documentElement.classList.remove('modal-open')
  }

  onMount(() => {
    onMessage('show', () => {
      open = true
      openModal()
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
</script>

<QueryClientProvider client={queryClient}>
  <ShadcnConfig portal={root}>
    <Router
      initialPath={import.meta.env.VITE_INITIAL_PATH}
      routes={[
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
          path: '/search-and-block/blocked',
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
          path: '/pro',
          component: ProPage,
        },
      ]}
    >
      <AppLayout {open}>
        <RouterView />
        <Button
          variant="ghost"
          size="icon"
          class="absolute top-0 right-0"
          onclick={() => {
            open = false
            closeModal()
          }}
        >
          <XIcon class="w-4 h-4" />
        </Button>
      </AppLayout>
    </Router>
  </ShadcnConfig>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors closeButton />
