<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    ChevronRightIcon,
    HandIcon,
    LanguagesIcon,
    LockIcon,
    PaintRollerIcon,
    ShieldBanIcon,
  } from 'lucide-svelte'
  import RouterLink from '$lib/components/logic/router/RouterLink.svelte'
  import { t } from '$lib/i18n'

  const menuItems = $derived([
    {
      icon: PaintRollerIcon,
      label: $t('settings.appearance.title'),
      href: '/settings/appearance',
    },
    {
      icon: HandIcon,
      label: $t('settings.filter.title'),
      href: '/settings/filter',
    },
    {
      icon: ShieldBanIcon,
      label: $t('settings.block.title'),
      href: '/settings/block',
    },
    {
      icon: LockIcon,
      label: $t('settings.privacy.title'),
      href: '/settings/privacy',
    },
    {
      icon: LanguagesIcon,
      label: $t('settings.languages.title'),
      href: '/settings/languages',
    },
    // { icon: HelpIcon, label: 'Help' },
    // { icon: AboutIcon, label: 'About' },
  ])
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
            <!-- svelte-ignore svelte_component_deprecated -->
            <svelte:component this={item.icon} class="w-6 h-6 text-zinc-400" />
            <span>{item.label}</span>
          </div>
          <ChevronRightIcon class="w-5 h-5" />
        </Button>
      </RouterLink>
    {/each}
  </nav>
</div>
