<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { localStore, localStorageAdapter } from '$lib/util/localStore'
  import { getSettings, type Settings } from '$lib/settings'
  import { SETTINGS_KEY } from '$lib/constants'
  import { Label } from '$lib/components/ui/label'
  import { SelectGroup } from '$lib/components/custom/select'
  import { getLocaleLanguage, setLocale, t } from '$lib/i18n'

  const settings = localStore<Settings>(
    SETTINGS_KEY,
    getSettings,
    localStorageAdapter(),
  )

  function onChangeLanguage(value?: Settings['language']) {
    if (!value) {
      return
    }
    $settings.language = value
    setLocale(value)
  }
</script>

<LayoutNav title="Languages" />

<div class="max-w-3xl mx-auto">
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium"
        >{$t('settings.languages.title')}</span
      >
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.languages.description')}
      </span>
    </div>
    <SelectGroup
      value={$settings.language ?? getLocaleLanguage()}
      onChange={onChangeLanguage}
      options={[
        { label: 'English', value: 'en-US' },
        { label: '简体中文 - Simplified Chinese', value: 'zh-CN' },
        { label: 'Español - Spanish', value: 'es' },
      ]}
    />
  </Label>
</div>
