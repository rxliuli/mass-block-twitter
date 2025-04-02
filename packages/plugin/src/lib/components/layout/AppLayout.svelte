<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import type { Snippet } from 'svelte'
  import AppSidebar from './AppSidebar.svelte'
  import { cn } from '$lib/utils'
  import {
    ArrowLeftIcon,
    HomeIcon,
    MessageCircleOffIcon,
    SettingsIcon,
    UserIcon,
    UsersIcon,
    CodeIcon,
    UserXIcon,
  } from 'lucide-svelte'
  import {
    goBack,
    navigate,
    router,
    useRoute,
  } from '$lib/components/logic/router'
  import type { MenuItem } from './types'
  import { setContext } from 'svelte'
  import { Button } from '../ui/button'
  import { t } from '$lib/i18n'
  import { getSettings } from '$lib/settings'

  let {
    open,
    children,
  }: {
    open: boolean
    children: Snippet
  } = $props()

  const menuItems: MenuItem[] = $derived([
    {
      title: $t('dashboard.title'),
      url: '/',
      icon: HomeIcon,
      to: 'content',
    },
    {
      title: $t('search-and-block.title'),
      url: '/search-and-block',
      icon: UserIcon,
      to: 'content',
    },
    {
      title: $t('modlists.title'),
      url: '/modlists',
      icon: UsersIcon,
      to: 'content',
    },
    {
      title: $t('muted-words.title'),
      url: '/muted-words',
      icon: MessageCircleOffIcon,
      to: 'content',
    },
    {
      title: $t('settings.title'),
      url: '/settings',
      icon: SettingsIcon,
      to: 'footer',
    },
    ...(import.meta.env.DEV || getSettings().devMode
      ? [
          {
            title: 'Dev',
            url: '/dev',
            icon: CodeIcon,
            to: 'content',
          } satisfies MenuItem,
        ]
      : []),
  ])
  const autoTitle = $derived(
    menuItems.find((it) => it.url === router.path)?.title ??
      $t('dashboard.title'),
  )
  let title = $state<string>()
  setContext('GlobalState', {
    setTitle: (val?: string) => {
      title = val
    },
  })

  const route = useRoute()
  const isTopLevel = $derived(
    !route.matched?.path ||
      menuItems.some((it) => route.matched?.path === it.url),
  )
  function safeGoBack() {
    if (router.history.length > 0) {
      goBack()
    } else {
      navigate('/')
    }
  }
</script>

<div
  id="mass-block-twitter"
  class={cn(
    'fixed w-full top-0 left-0 h-screen h-[100dvh] flex flex-col bg-background',
    open ? 'block' : 'hidden',
  )}
>
  <Sidebar.Provider class="h-full">
    <AppSidebar items={menuItems} />
    <main class="w-full overflow-hidden">
      <header
        class="flex items-center gap-2 h-10 sticky top-0 bg-background p-6"
      >
        {#if isTopLevel}
          <Sidebar.Trigger />
        {:else}
          <Button variant="link" size="icon" class="-ml-2" onclick={safeGoBack}>
            <ArrowLeftIcon class="w-4 h-4" />
          </Button>
        {/if}
        <h1 class="text-xl font-bold truncate flex-1" id="layout-nav-title">
          {title ?? autoTitle}
        </h1>
        <div class="ml-auto" id="layout-nav-extra"></div>
      </header>
      <div class="h-[calc(100%-3rem)] px-6 pt-2 pb-6 overflow-auto">
        {@render children?.()}
      </div>
    </main>
  </Sidebar.Provider>
</div>
