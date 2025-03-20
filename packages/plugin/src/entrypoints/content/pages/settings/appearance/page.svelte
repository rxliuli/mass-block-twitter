<script lang="ts">
  import RadioGroup from '$lib/components/custom/radio/RadioGroup.svelte'
  import { Label } from '$lib/components/ui/label'
  import { useSettings } from '$lib/settings'
  import { setMode } from 'mode-watcher'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { t } from '$lib/i18n'
  import { Switch } from '$lib/components/ui/switch'

  const themes = $derived([
    { label: $t('settings.appearance.theme.system'), value: 'system' },
    { label: $t('settings.appearance.theme.light'), value: 'light' },
    { label: $t('settings.appearance.theme.dark'), value: 'dark' },
  ])

  const settings = useSettings()

  function onChangeTheme(value: string) {
    setMode(value as any)
  }

  function onChangeFloatingButton(checked: boolean) {
    $settings.showFloatingButton = checked
  }
</script>

<LayoutNav title={$t('settings.appearance.title')} />

<div class="max-w-3xl mx-auto">
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium"
        >{$t('settings.appearance.theme.title')}</span
      >
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.appearance.theme.description')}
      </span>
    </div>
    <RadioGroup
      bind:value={$settings.theme}
      options={themes}
      onChange={onChangeTheme}
    />
  </Label>
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium"
        >{$t('settings.appearance.floatingButton.title')}</span
      >
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.appearance.floatingButton.description')}
      </span>
    </div>
    <Switch
      checked={$settings.showFloatingButton ?? true}
      onCheckedChange={onChangeFloatingButton}
    />
  </Label>
</div>
