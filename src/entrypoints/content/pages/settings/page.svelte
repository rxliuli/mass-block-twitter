<script lang="ts">
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte'
  import Label from '$lib/components/ui/label/label.svelte'
  import { SETTINGS_KEY } from '$lib/constants'
  import { getSettings } from '$lib/settings'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'

  const settings = localStore(
    SETTINGS_KEY,
    getSettings(),
    localStorageAdapter(),
  )
</script>

<div>
  <Label class="flex items-center gap-4 p-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Suspicious Accounts</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from accounts with default avatars, no bio and zero
        followers. Their content will be automatically hidden.
      </span>
    </div>
    <Checkbox
      class="shrink-0"
      bind:checked={$settings.hideSuspiciousAccounts}
    />
  </Label>
  <Label class="flex items-center gap-4 p-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Spam Accounts</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from accounts that are marked as spam.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideSpamAccounts} />
  </Label>
</div>
