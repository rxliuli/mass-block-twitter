<script lang="ts">
  import { FancyMultiSelect } from '$lib/components/custom/select'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte'
  import Label from '$lib/components/ui/label/label.svelte'
  import { SETTINGS_KEY } from '$lib/constants'
  import { getSettings, type Settings } from '$lib/settings'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { languages } from '$lib/constants/languages'

  const settings = localStore<Settings>(
    SETTINGS_KEY,
    (value) => ({ ...getSettings(), ...(value ?? {}) }),
    localStorageAdapter(),
  )
</script>

<LayoutNav title="Filter Control" />

<div class="max-w-3xl mx-auto">
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
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
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Spam Accounts</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from accounts that are marked as spam.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideSpamAccounts} />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Mute Words</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets that contain muted words.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideMutedWords} />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">Hide Mod List Accounts</span>
      <span class="block mt-1 text-sm text-gray-500">
        Hide tweets from accounts that are subscribed to a mod list.
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideModListAccounts} />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
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
  <Label class="py-4 block">
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
</div>
