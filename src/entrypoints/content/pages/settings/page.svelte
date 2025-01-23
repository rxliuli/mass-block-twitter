<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { ArrowLeftIcon } from 'lucide-svelte'
  import { router } from '$lib/route.svelte'
  import PageHeader from '$lib/components/logic/PageHeader.svelte'
  import BlockKeywords from './components/BlockKeywords.svelte'
  import SharedBlacklist from './components/SharedBlacklist.svelte'
</script>

<PageHeader>
  <Button variant="ghost" size="icon" onclick={() => (router.path = '/')}>
    <ArrowLeftIcon class="w-4 h-4" />
  </Button>
  Settings
</PageHeader>
<div class="flex flex-col gap-4 container mx-auto">
  <BlockKeywords />
  <!-- <SharedBlacklist /> -->
</div>
