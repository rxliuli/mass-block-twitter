<script lang="ts">
  import type { Snippet } from 'svelte'
  import AppSidebar from './components/AppSidebar.svelte'
  import * as Sheet from '$lib/components/ui/sheet'
  import { useSidebar } from '$lib/store/layout.svelte'
  import { PanelLeftIcon } from 'lucide-svelte'
  import { Button } from '@/components/ui/button'

  let { children }: { children: Snippet } = $props()
  const sidebar = useSidebar()
</script>

<div class="grid grid-cols-[auto_1fr]">
  <div class="sticky top-12 h-[calc(100vh-3rem)] overflow-auto">
    <AppSidebar class="hidden md:block" />
    <Sheet.Root open={sidebar.open}>
      <Sheet.Content side="left">
        <Sheet.Header>
          <Button
            variant="ghost"
            size="icon"
            class="absolute top-1 left-0"
            onclick={() => sidebar.toggle()}
          >
            <PanelLeftIcon class="size-4" />
          </Button>
        </Sheet.Header>
        <AppSidebar class="pt-2" />
      </Sheet.Content>
    </Sheet.Root>
  </div>
  <main class="min-h-[calc(100vh-3rem)]">
    {@render children?.()}
  </main>
</div>
