<script lang="ts">
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import UsersPage from './pages/users/page.svelte'
  import MutedWordsPage from './pages/muted-words/page.svelte'
  import SettingsPage from './pages/settings/page.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher, mode } from 'mode-watcher'
  import { Router, RouterView } from '$lib/components/logic/router'
  import AppLayout from './layout/AppLayout.svelte'
  import { Button } from '$lib/components/ui/button'
  import { XIcon } from 'lucide-svelte'

  let open = $state(false)

  onMount(() => {
    onMessage('show', () => {
      open = true
    })
    return removeAllListeners
  })

  const queryClient = new QueryClient()

  // TODO https://github.com/svecosystem/mode-watcher/issues/104
  $effect(() => {
    const root = document
      .querySelector('mass-block-twitter')
      ?.shadowRoot?.querySelector('html')
    const current = $mode
    if (root) {
      root.className = `color-scheme: ${current}`
    }
  })
</script>

<QueryClientProvider client={queryClient}>
  <Router
    routes={[
      {
        path: '/',
        component: UsersPage,
      },
      {
        path: '/muted-words',
        component: MutedWordsPage,
      },
      {
        path: '/settings',
        component: SettingsPage,
      },
    ]}
  >
    <AppLayout {open}>
      <RouterView />
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-0 right-0"
        onclick={() => (open = false)}
      >
        <XIcon class="w-4 h-4" />
      </Button>
    </AppLayout>
  </Router>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors />
