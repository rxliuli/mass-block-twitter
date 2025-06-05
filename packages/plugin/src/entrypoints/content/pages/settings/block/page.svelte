<script lang="ts">
  import { Label } from '$lib/components/ui/label'
  import { Slider } from '$lib/components/custom/slider'
  import { t } from '$lib/i18n'
  import { useSettings } from '$lib/settings'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'

  const settings = useSettings()
</script>

<LayoutNav title={$t('settings.block.title')} />

<Label class="py-4 block">
  <div class="flex items-center justify-between gap-2">
    <div>
      <span class="block text-base font-medium">
        {$t('settings.block.blockSpeed.title')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.block.blockSpeed.description')}
      </span>
    </div>
    <span
      class="text-sm {$settings.blockSpeedRange &&
      $settings.blockSpeedRange[0] > 29
        ? 'text-yellow-500'
        : 'text-green-500'}"
    >
      {$settings.blockSpeedRange
        ? `${$settings.blockSpeedRange[0]} - ${$settings.blockSpeedRange[1]}`
        : `0`}
    </span>
  </div>
  <Slider
    range={true}
    value={$settings.blockSpeedRange ?? [0, 0]}
    onValueChange={(value) => {
      $settings.blockSpeedRange = value
    }}
    min={0}
    max={60}
    step={1}
  />
</Label>
