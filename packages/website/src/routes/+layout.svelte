<script lang="ts">
  import '../app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '@/components/layout/Header.svelte'
  import Footer from '@/components/layout/Footer.svelte'
  import { Toaster } from '$lib/components/ui/sonner'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

  let { children } = $props()
  const queryClient = new QueryClient()
</script>

<ModeWatcher />
<Toaster />

<QueryClientProvider client={queryClient}>
  <Header />
  {@render children()}
  <Footer />
</QueryClientProvider>
