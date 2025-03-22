<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { useSettings } from '$lib/hooks/settings.svelte'
  import { Button } from '@/components/ui/button'
  import { useSidebar } from '@/store/layout.svelte'
  import { cn } from '@/utils'

  let { class: className }: { class?: string } = $props()

  const enUSItems = [
    {
      label: 'Introduction',
      href: '/docs',
    },
    {
      label: 'Installation',
      href: '/docs/01-installation',
    },
    {
      label: 'Usage',
      href: '/docs/02-usage',
    },
    {
      label: 'FAQ',
      href: '/docs/03-faq',
    },
    {
      label: 'Changelog',
      href: '/docs/04-changelog',
    },
    {
      label: 'Contact',
      href: '/docs/05-contact',
    },
  ]
  const sidebarZhCNItems = [
    {
      label: '介绍',
      href: '/docs/zh-cn',
    },
    {
      label: '安装指南',
      href: '/docs/zh-cn/01-installation',
    },
    {
      label: '用户指南',
      href: '/docs/zh-cn/02-usage',
    },
    {
      label: '更新日志',
      href: '/docs/zh-cn/04-changelog',
    },
    {
      label: '联系我们',
      href: '/docs/zh-cn/05-contact',
    },
  ]
  const { value: settings } = useSettings()
  const sidebarItems =
    settings.language === 'en-US' ? enUSItems : sidebarZhCNItems

  const sidebar = useSidebar()
</script>

<aside class={cn('h-full w-64 border-r py-2', className)}>
  {#each sidebarItems as item}
    <a href={item.href}>
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start"
        onclick={() => sidebar.toggle(false)}
      >
        {item.label}
      </Button>
    </a>
  {/each}
</aside>
