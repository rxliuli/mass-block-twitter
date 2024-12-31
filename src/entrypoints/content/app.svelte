<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { onMessage, removeAllListeners } from '$lib/messaging'
  import UserList from './UserList.svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { ModeWatcher } from 'mode-watcher'

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
</script>

<QueryClientProvider client={queryClient}>
  <Dialog.Root {open} controlledOpen={true} onOpenChange={(v) => (open = v)}>
    <Dialog.Content
      class="min-w-full h-screen flex flex-col"
      portalProps={{
        to: document
          .querySelector('mass-block-twitter')
          ?.shadowRoot?.querySelector('body')!,
      }}
    >
      <Dialog.Header class="mb-0">
        <Dialog.Title>Record Users</Dialog.Title>
      </Dialog.Header>
      <UserList />
    </Dialog.Content>
  </Dialog.Root>
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors />
