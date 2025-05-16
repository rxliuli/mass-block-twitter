<script lang="ts">
  import { FancyMultiSelect, SelectGroup } from '$lib/components/custom/select'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte'
  import Label from '$lib/components/ui/label/label.svelte'
  import { getDefaultSettings, useSettings } from '$lib/settings'
  import { languages } from '$lib/constants/languages'
  import { t } from '$lib/i18n'

  const settings = useSettings()
</script>

<LayoutNav title={$t('settings.filter.title')} />

<div class="max-w-3xl mx-auto">
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideSuspiciousAccounts')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideSuspiciousAccounts.description')}
      </span>
    </div>
    <Checkbox
      class="shrink-0"
      bind:checked={$settings.hideSuspiciousAccounts}
    />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideSpamAccounts')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideSpamAccounts.description')}
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideSpamAccounts} />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideMutedWords')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideMutedWords.description')}
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideMutedWords} />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideModListAccounts')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideModListAccounts.description')}
      </span>
    </div>
    <Checkbox class="shrink-0" bind:checked={$settings.hideModListAccounts} />
  </Label>
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideBlueVerified')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideBlueVerified.description')}
      </span>
    </div>
    <SelectGroup
      bind:value={$settings.hideBlueVerified}
      class="w-full"
      placeholder={$t('settings.filter.hideBlueVerified.placeholder')}
      options={[
        {
          value: 'none',
          label: $t('settings.filter.hideBlueVerified.none'),
        },
        {
          value: 'only-blue',
          label: $t('settings.filter.hideBlueVerified.only-blue'),
        },
        {
          value: 'only-non-blue',
          label: $t('settings.filter.hideBlueVerified.only-non-blue'),
        },
      ]}
    ></SelectGroup>
  </Label>
  <Label class="py-4 block">
    <div class="mb-2">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideLanguages')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideLanguages.description')}
      </span>
    </div>
    <FancyMultiSelect
      options={languages}
      placeholder={$t('settings.filter.hideLanguages.placeholder')}
      bind:value={$settings.hideLanguages}
    />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideGrok')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideGrok.description')}
      </span>
    </div>
    <Checkbox
      class="shrink-0"
      checked={$settings.hideGrok ?? false}
      onCheckedChange={(checked) => {
        $settings.hideGrok = checked
      }}
    />
  </Label>
  <Label class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.filter.hideAdvertiser')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.filter.hideAdvertiser.description')}
      </span>
    </div>
    <Checkbox
      class="shrink-0"
      checked={$settings.hideAdvertiser ?? getDefaultSettings().hideAdvertiser}
      onCheckedChange={(checked) => {
        $settings.hideAdvertiser = checked
      }}
    />
  </Label>
</div>
