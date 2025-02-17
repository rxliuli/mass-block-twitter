<script lang="ts">
  import { BadgeCheckIcon, BadgeXIcon } from 'lucide-svelte'

  const { verified }: { verified: boolean } = $props()
</script>

{#if verified}
  <BadgeCheckIcon class="text-blue-500" />
{:else}
  <BadgeCheckIcon />
{/if}
