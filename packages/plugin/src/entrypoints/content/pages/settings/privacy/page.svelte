<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import { dbApi } from '$lib/db'
  import { Trash2Icon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'

  async function onClearCache() {
    await dbApi.clear()
    toast.success('Cache cleared')
  }
</script>

<LayoutNav title="Privacy and Security" />

<div class="max-w-3xl mx-auto">
  <div class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Clear All Cache</span>
      <span class="block mt-1 text-sm text-gray-500">
        Clear all cache data, including record users and tweets.
      </span>
    </div>
    <Button
      variant="ghost"
      size="icon"
      class="transform translate-x-2"
      onclick={onClearCache}
    >
      <Trash2Icon />
    </Button>
  </div>
</div>
