<script lang="ts">
  import FancyMultiSelect from '$lib/components/custom/FancyMultiSelect.svelte'
  import { Button } from '$lib/components/ui/button'
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte'
  import Label from '$lib/components/ui/label/label.svelte'
  import { SETTINGS_KEY } from '$lib/constants'
  import { dbApi } from '$lib/db'
  import { getSettings, type Settings } from '$lib/settings'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { BadgeCheckIcon, Trash2Icon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { languages } from './constants/lang'

  const settings = localStore<Settings>(
    SETTINGS_KEY,
    (value) => ({ ...getSettings(), ...(value ?? {}) }),
    localStorageAdapter(),
  )

  async function onClearCache() {
    await dbApi.clear()
    toast.success('Cache cleared')
  }
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
  <Label class="flex items-center gap-4 p-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Mute Words</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets that contain muted words.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideMutedWords} />
  </Label>
  <Label class="flex items-center gap-4 p-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Mod List Accounts</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from accounts that are subscribed to a mod list.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideModListAccounts} />
  </Label>
  <Label class="flex items-center gap-4 p-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium"
        >Hide Blue Verified Accounts</span
      >
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from blue verified accounts, except those you follow.
      </span>
    </div>
    <Checkbox
      class="shrink-0"
      bind:checked={$settings.hideBlueVerifiedAccounts}
    />
  </Label>
  <Label class="p-4">
    <div class="mb-2">
      <span class="block text-base font-medium">Hide Languages</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from specific languages.
      </span>
    </div>
    <FancyMultiSelect
      options={languages}
      bind:value={$settings.hideLanguages}
    />
  </Label>
  <div class="flex items-center gap-4 p-4 cursor-pointer">
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
