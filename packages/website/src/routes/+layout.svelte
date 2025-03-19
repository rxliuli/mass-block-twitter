<script lang="ts">
  import '../app.css'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '@/components/layout/Header.svelte'
  import Footer from '@/components/layout/Footer.svelte'
  import { Toaster } from '@/components/ui/sonner'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'
  import { showInstallToast, ShowInstallToastFlag } from '@/showToast'
  import type { LayoutProps } from './$types'
  import { uniqBy } from 'es-toolkit'
  import { page } from '$app/state'

  interface Metadata {
    name?: string
    property?: string
    content: string
  }

  const props: LayoutProps = $props()

  const queryClient = new QueryClient()

  const defaultMetadata: Metadata[] = [
    {
      name: 'title',
      content: 'Mass Block Twitter',
    },
    {
      name: 'description',
      content:
        'Mass Block is a browser extension that block multiple spam accounts on Twitter/X with just a few clicks.',
    },
    // Open Graph tags for Facebook and other social platforms
    {
      property: 'og:title',
      content: 'Mass Block Twitter',
    },
    {
      property: 'og:description',
      content:
        'Mass Block is a browser extension that block multiple spam accounts on Twitter/X with just a few clicks.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:url',
      content: 'https://mass-block-twitter.rxliuli.com',
    },
    {
      property: 'og:site_name',
      content: 'Mass Block Twitter',
    },
    // Twitter Card tags
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@rxliuli',
    },
    {
      name: 'twitter:creator',
      content: '@rxliuli',
    },
    {
      name: 'twitter:title',
      content: 'Mass Block Twitter',
    },
    {
      name: 'twitter:description',
      content:
        'Mass Block is a browser extension that block multiple spam accounts on Twitter/X with just a few clicks.',
    },
    // Additional SEO tags
    {
      name: 'keywords',
      content:
        'twitter, browser extension, block spam, mass block, twitter tools',
    },
    {
      name: 'author',
      content: 'rxliuli',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0',
    },
    {
      name: 'theme-color',
      content: '#ffffff',
    },
    {
      name: 'application-name',
      content: 'Mass Block Twitter',
    },
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'default',
    },
    {
      name: 'apple-mobile-web-app-title',
      content: 'Mass Block Twitter',
    },
    {
      name: 'format-detection',
      content: 'telephone=no',
    },
    {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'msapplication-TileColor',
      content: '#ffffff',
    },
    {
      name: 'msapplication-config',
      content: 'none',
    },
  ]

  const metadata = $derived.by(() =>
    uniqBy(
      [...(page.data?.metadata ?? []), ...defaultMetadata],
      (meta) => meta.name || meta.property || '',
    ),
  )

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

<svelte:head>
  <title>{page.data.title ?? 'Mass Block Twitter'}</title>
  {#each metadata as meta}
    <meta {...meta} />
  {/each}
</svelte:head>

<ModeWatcher />
<Toaster richColors />

<QueryClientProvider client={queryClient}>
  <Header />
  {@render props.children()}
  <Footer />
</QueryClientProvider>
