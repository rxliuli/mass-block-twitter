<script lang="ts">
  import { PanelLeftIcon } from 'lucide-svelte'
  import AuthButton from '../auth/AuthButton.svelte'
  import Button from '../ui/button/button.svelte'
  import { useSidebar } from '$lib/store/layout.svelte'
  import { page } from '$app/state'

  const siteMetadata = {
    title: 'Mass Block Twitter',
    description: 'One-Click Solution to Clean Up Twitter/X Spam',
    author: 'rxliuli',
  }

  const sidebar = useSidebar()
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div class="md:container flex h-12 items-center">
    <nav
      class="flex items-center pl-2 space-x-2 md:space-x-6 text-sm font-medium"
    >
      {#if page.url.pathname.startsWith('/docs')}
        <Button
          variant="ghost"
          size="icon"
          class="md:hidden -ml-2"
          onclick={() => sidebar.toggle()}
        >
          <PanelLeftIcon class="size-4" />
        </Button>
      {/if}
      <a href="/" class="font-bold transition-colors hover:text-foreground/80">
        {siteMetadata.title}
      </a>
      <a href="/docs" class="transition-colors hover:text-foreground/80">
        Docs
      </a>
      <a href="/pricing" class="transition-colors hover:text-foreground/80">
        Pricing
      </a>
    </nav>
    <div class="flex-1"></div>
    <AuthButton />
  </div>
</header>
