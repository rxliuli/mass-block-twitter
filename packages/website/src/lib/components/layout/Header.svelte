<script lang="ts">
  import { MoonIcon, SunIcon } from 'lucide-svelte'
  import { Button } from '../ui/button'
  import { toggleMode } from 'mode-watcher'
  import AuthButton from '../auth/AuthButton.svelte'

  const siteMetadata = {
    title: 'Mass Block Twitter',
    description: 'One-Click Solution to Clean Up Twitter/X Spam',
    author: 'rxliuli',
  }
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div class="container flex h-14 items-center">
    <nav class="flex items-center space-x-6 text-sm font-medium">
      <a href="/" class="font-bold transition-colors hover:text-foreground/80">
        {siteMetadata.title}
      </a>
      <!-- wait for docs -->
      <!-- <a href="/docs" class="transition-colors hover:text-foreground/80">
        Docs
      </a> -->
      <!-- wait for paddle review -->
      <!-- <a href="/pricing" class="transition-colors hover:text-foreground/80">
        Pricing
      </a> -->
    </nav>
    <div class="flex-1"></div>
    <AuthButton />
    <Button onclick={toggleMode} variant="outline" size="icon">
      <SunIcon
        class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      />
      <MoonIcon
        class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
      <span class="sr-only">Toggle theme</span>
    </Button>
  </div>
</header>
