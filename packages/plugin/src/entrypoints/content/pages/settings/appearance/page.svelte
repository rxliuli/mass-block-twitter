<script lang="ts">
  import RadioGroup from '$lib/components/custom/radio/RadioGroup.svelte'
  import { Label } from '$lib/components/ui/label'
  import { getSettings, type Settings } from '$lib/settings'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { SETTINGS_KEY } from '$lib/constants'
  import { setMode } from 'mode-watcher'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'

  const themes = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ]

  const settings = localStore<Settings>(
    SETTINGS_KEY,
    getSettings,
    localStorageAdapter(),
  )

  function onChangeTheme(value: string) {
    setMode(value as any)
  }
</script>

<LayoutNav title="Appearance" />

<div class="max-w-3xl mx-auto">
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium">Theme</span>
      <span class="block mt-1 text-sm text-gray-500">
        Choose the theme you want to use.
      </span>
    </div>
    <RadioGroup
      bind:value={$settings.theme}
      options={themes}
      onChange={onChangeTheme}
    />
  </Label>
</div>
