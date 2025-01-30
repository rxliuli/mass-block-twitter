<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { Snippet } from 'svelte'
  import AppSidebar from './AppSidebar.svelte'
  import { cn } from '$lib/utils'
  import { HomeIcon, MessageCircleOffIcon, SettingsIcon } from 'lucide-svelte'
  import { router } from '$lib/components/logic/router/route.svelte'
  import type { MenuItem } from './types'

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
      icon: HomeIcon,
      to: 'content',
    },
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
  const title = $derived(
    menuItems.find((it) => it.url === router.path)?.title ?? 'Record Users',
  )
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
    <main class="h-full overflow-auto">
      <div class="flex items-center gap-2 mb-2">
        <Sidebar.Trigger />
        <h1 class="text-xl font-bold">{title}</h1>
      </div>
      {@render children?.()}
    </main>
  </Sidebar.Provider>
</div>
