<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import type { Snippet } from 'svelte'
  import AppSidebar from './AppSidebar.svelte'
  import { cn } from '$lib/utils'
  import {
    MessageCircleOffIcon,
    SettingsIcon,
    UserIcon,
    UsersIcon,
  } from 'lucide-svelte'
  import { router } from '$lib/components/logic/router/route.svelte'
  import type { MenuItem } from './types'
  import { setContext } from 'svelte'
  let {
    open,
    children,
  }: {
    open: boolean
    children: Snippet
  } = $props()

  const menuItems: MenuItem[] = [
    {
      title: 'Record Users',
      url: '/',
      icon: UserIcon,
      to: 'content',
    },
    // {
    //   title: 'Moderation Lists',
    //   url: '/modlists',
    //   icon: UsersIcon,
    //   to: 'content',
    // },
    {
      title: 'Muted Words',
      url: '/muted-words',
      icon: MessageCircleOffIcon,
      to: 'content',
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: SettingsIcon,
      to: 'footer',
    },
  ]
  const autoTitle = $derived(
    menuItems.find((it) => it.url === router.path)?.title ?? 'Record Users',
  )
  let title = $state<string>()
  setContext('GlobalState', {
    setTitle: (val?: string) => {
      title = val
    },
  })
</script>

<div
  id="mass-block-twitter"
  class={cn(
    'fixed w-full top-0 left-0 h-screen h-[100dvh] flex flex-col bg-background p-6',
    open ? 'block' : 'hidden',
  )}
>
  <Sidebar.Provider class="h-full">
    <AppSidebar items={menuItems} />
    <main class="w-full h-full flex flex-col overflow-auto">
      <div class="flex items-center gap-2 mb-2">
        <Sidebar.Trigger />
        <h1 class="text-xl font-bold" id="layout-nav-title">
          {title ?? autoTitle}
        </h1>
        <div class="ml-auto" id="layout-nav-extra"></div>
      </div>
      <div class="flex-1 w-full overflow-auto">
        {@render children?.()}
      </div>
    </main>
  </Sidebar.Provider>
</div>
