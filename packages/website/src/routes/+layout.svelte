<script lang="ts">
  import '../app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '@/components/layout/Header.svelte'
  import Footer from '@/components/layout/Footer.svelte'
  import { Toaster } from '$lib/components/ui/sonner'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import { installExt } from '@/installExt'
  import { getAuthInfo } from '@/components/auth/auth.svelte'

  let { children } = $props()
  const queryClient = new QueryClient()

  onMount(async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const meta = document.querySelector('meta[name="mass-block-twitter"]')
    if (meta) {
      return
    }
    toast.info('You haven’t installed the plugin yet, please install it', {
      action: {
        label: 'Install',
        onClick: installExt,
      },
      duration: 10000,
    })
  })
</script>

<ModeWatcher />
<Toaster richColors />

<QueryClientProvider client={queryClient}>
  <Header />
  {@render children()}
  <Footer />
</QueryClientProvider>
