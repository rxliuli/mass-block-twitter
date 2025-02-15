<script lang="ts">
  import { cn } from '$lib/utils'
  import { Loader2Icon } from 'lucide-svelte'

  let {
    message = 'Loading...',
    ...props
  }: { message?: string; class?: string } = $props()
</script>

<div class={cn('flex justify-center items-center h-full gap-2', props.class)}>
  <Loader2Icon class="w-4 h-4 animate-spin" />
  <p class="text-gray-400">{message}</p>
</div>
