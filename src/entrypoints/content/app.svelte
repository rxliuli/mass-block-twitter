<script lang="ts">
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import UserList from './pages/users/page.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher, mode } from 'mode-watcher'
  import { router } from '$lib/route.svelte'
  import SettingsView from './pages/settings/page.svelte'
  import { cn } from '$lib/utils'
  import { XIcon } from 'lucide-svelte'
  import Button from '$lib/components/ui/button/button.svelte'

  let open = $state(false)

  onMount(() => {
    onMessage('show', () => {
      open = true
    })
  })
  onDestroy(() => {
    removeAllListeners()
  })

  const queryClient = new QueryClient()

  router.routes = [
    {
      path: '/',
      component: UserList,
    },
    {
      path: '/settings',
      component: SettingsView,
    },
  ]
  const route = $derived(router.routes.find((it) => router.path === it.path))

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
  <div
    id="mass-block-twitter"
    class={cn(
      'fixed w-full top-0 left-0 h-screen h-[100dvh] flex flex-col bg-background p-6',
      open ? 'block' : 'hidden',
    )}
  >
    {#if route}
      <route.component />
    {/if}
    <Button
      variant="ghost"
      size="icon"
      class="absolute top-0 right-0"
      onclick={() => (open = false)}
    >
      <XIcon class="w-4 h-4" />
    </Button>
  </div>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors />
