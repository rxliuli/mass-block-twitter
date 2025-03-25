<script lang="ts">
  import { Label } from '$lib/components/ui/label'
  import { Slider } from '$lib/components/custom/sllider'
  import { t } from '$lib/i18n'
  import { useSettings } from '$lib/settings'

  const settings = useSettings()
</script>

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
      class="text-sm {$settings.blockSpeed && $settings.blockSpeed > 29
        ? 'text-yellow-500'
        : 'text-green-500'}"
    >
      {$settings.blockSpeed ?? 0}
    </span>
  </div>
  <Slider
    value={$settings.blockSpeed}
    onValueChange={(value) => {
      $settings.blockSpeed = value
    }}
    min={0}
    max={60}
    step={1}
  />
</Label>
