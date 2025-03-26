<script lang="ts" generics="T extends Component<any>">
  import { type Component } from 'svelte'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { ModeWatcher } from 'mode-watcher'
  import { Toaster } from '$lib/components/ui/sonner'

  type ComponentProps<T extends Component<any>> =
    T extends Component<infer P> ? P : never

  let { component, props }: { component?: T; props: ComponentProps<T> } =
    $props()

  const queryClient = new QueryClient()
</script>

<QueryClientProvider client={queryClient}>
  {#if component}
    <!-- svelte-ignore svelte_component_deprecated -->
    <svelte:component this={component} {...props} />
  {/if}
</QueryClientProvider>

<ModeWatcher />
<!-- TODO https://github.com/vitest-dev/vitest/issues/7742 -->
<Toaster richColors closeButton expand position="top-right" />
