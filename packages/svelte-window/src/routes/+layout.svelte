<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import '../app.css'
  let { children } = $props()

  const queryClient = new QueryClient()
</script>

<div class="flex h-screen w-screen flex-col">
  <header class="flex items-center gap-2">
    <a href="/list/fixed-size">List - Fixed Size</a>
    <a href="/list/auto-size">List - Auto Size</a>
    <a href="/list/infinite">List - Infinite</a>
    <a href="/list/grid">List - Grid</a>
  </header>
  <main class="flex-1">
    <QueryClientProvider client={queryClient}>
      {@render children()}
    </QueryClientProvider>
  </main>
</div>
