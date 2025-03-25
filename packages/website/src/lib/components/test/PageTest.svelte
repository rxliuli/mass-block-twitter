<script lang="ts" generics="T extends Component">
  import type { Component } from 'svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { ModeWatcher } from 'mode-watcher'
  import { Toaster } from '@/components/ui/sonner'

  let {
    component,
    props,
  }: { component: T; props?: T extends Component<infer P> ? P : never } =
    $props()

  const queryClient = new QueryClient()
</script>

<QueryClientProvider client={queryClient}>
  <!-- svelte-ignore svelte_component_deprecated -->
  <svelte:component this={component} {...props as any} />
</QueryClientProvider>

<ModeWatcher />
<Toaster richColors />
