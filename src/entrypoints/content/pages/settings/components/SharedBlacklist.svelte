<script lang="ts">
  import { Label } from '$lib/components/ui/label'
  import { Switch } from '$lib/components/ui/switch'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'

  const sharedBlacklist = localStore(
    'MASS_BLOCK_TWITTER_EANBLE_SHARED_BLACKLIST',
    false,
    localStorageAdapter(),
  )
</script>

<div class="flex items-center justify-between gap-4">
  <Label for="sharedBlacklist" class="block mb-2">Enable shared blacklist</Label
  >
  <Switch id="sharedBlacklist" bind:checked={$sharedBlacklist} />
</div>
