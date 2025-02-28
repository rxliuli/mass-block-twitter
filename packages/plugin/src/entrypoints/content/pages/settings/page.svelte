<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    ChevronRightIcon,
    HandIcon,
    LockIcon,
    PaintRollerIcon,
  } from 'lucide-svelte'
  import RouterLink from '$lib/components/logic/router/RouterLink.svelte'

  const menuItems = [
    {
      icon: PaintRollerIcon,
      label: 'Appearance',
      href: '/settings/appearance',
    },
    { icon: HandIcon, label: 'Filter Control', href: '/settings/filter' },
    {
      icon: LockIcon,
      label: 'Privacy and security',
      href: '/settings/privacy',
    },
    // { icon: HelpIcon, label: 'Help' },
    // { icon: AboutIcon, label: 'About' },
  ]
</script>

<div class="max-w-3xl mx-auto">
  <nav class="flex flex-col">
    {#each menuItems as item}
      <RouterLink href={item.href}>
        <Button
          variant="ghost"
          class="flex items-center justify-between w-full p-5 text-lg rounded-lg"
        >
          <div class="flex items-center gap-4">
            <svelte:component this={item.icon} class="w-6 h-6 text-zinc-400" />
            <span>{item.label}</span>
          </div>
          <ChevronRightIcon class="w-5 h-5" />
        </Button>
      </RouterLink>
    {/each}
  </nav>
</div>
