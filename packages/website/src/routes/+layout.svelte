<script lang="ts">
  import '../app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '@/components/layout/Header.svelte'
  import Footer from '@/components/layout/Footer.svelte'
  import { Toaster } from '$lib/components/ui/sonner'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'
  import { showInstallToast, ShowInstallToastFlag } from '@/showToast'

  let { children } = $props()
  const queryClient = new QueryClient()

  onMount(async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const meta = document.querySelector('meta[name="mass-block-twitter"]')
    if (meta) {
      return
    }
    if (ShowInstallToastFlag) {
      return
    }
    showInstallToast()
  })
</script>

<ModeWatcher />
<Toaster richColors />

<QueryClientProvider client={queryClient}>
  <Header />
  {@render children()}
  <Footer />
</QueryClientProvider>
