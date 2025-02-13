<script lang="ts">
  import { Loader2Icon } from 'lucide-svelte'

  let { message = 'Loading...' } = $props()
</script>

<div class="flex justify-center items-center h-full gap-2">
  <Loader2Icon class="w-4 h-4 animate-spin" />
  <p class="text-gray-400">{message}</p>
</div>
