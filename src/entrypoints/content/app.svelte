<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import UserList from './UserList.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher } from 'mode-watcher'
  import { router } from './route.svelte'
  import SettingsView from './SettingsView.svelte'

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
</script>

<QueryClientProvider client={queryClient}>
  <Dialog.Root {open} controlledOpen={true} onOpenChange={(v) => (open = v)}>
    <Dialog.Content
      class="min-w-full h-screen h-[100dvh] flex flex-col"
      portalProps={{
        to: document
          .querySelector('mass-block-twitter')
          ?.shadowRoot?.querySelector('body')!,
      }}
    >
      {#if route}
        <route.component />
      {/if}
    </Dialog.Content>
  </Dialog.Root>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors />
