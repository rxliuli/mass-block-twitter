<script lang="ts">
  import { setMode } from 'mode-watcher'
  import { SelectGroup } from '../extra/select'
  import { GlobeIcon, MoonIcon, SunIcon, SunMoonIcon } from 'lucide-svelte'
  import { useSettings } from '@/hooks/settings.svelte'

  let { value: settings, sync } = useSettings()

  const languages = [
    { value: 'en-US', label: 'English' },
    { value: 'zh-CN', label: '中文' },
  ]
  const themes = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]
</script>

<footer class="border-t bg-background">
  <div class="container py-8 md:py-12">
    <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
      <!-- Company Info -->
      <div class="col-span-2 md:col-span-1">
        <a href="/" class="text-lg font-semibold">Mass Block Twitter</a>
        <p class="mt-2 text-sm text-muted-foreground">
          Built by <a
            href="https://github.com/rxliuli"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium underline underline-offset-4">rxliuli</a
          >
        </p>
      </div>

      <!-- Legal Links -->
      <div class="flex flex-col space-y-2">
        <h3 class="text-sm font-semibold">Legal</h3>
        <a
          href="/docs/terms"
          class="text-sm text-muted-foreground hover:underline"
          >Terms of Service</a
        >
        <a
          href="/docs/privacy"
          class="text-sm text-muted-foreground hover:underline"
          >Privacy Policy</a
        >
        <a
          href="/docs/refund"
          class="text-sm text-muted-foreground hover:underline">Refund Policy</a
        >
      </div>

      <!-- Social Links -->
      <div class="flex flex-col space-y-2">
        <h3 class="text-sm font-semibold">Social</h3>
        <a
          href="https://x.com/rxliuli"
          target="_blank"
          class="text-sm text-muted-foreground hover:underline">Twitter</a
        >
        <a
          href="https://github.com/rxliuli"
          target="_blank"
          class="text-sm text-muted-foreground hover:underline">GitHub</a
        >
      </div>

      <div class="col-span-2 flex flex-col space-y-4 md:col-span-1">
        <!-- <SelectGroup
          options={languages}
          value={settings.language}
          onChange={(value) => {
            settings.language = value
            sync()
          }}
        >
          {#snippet placeholder()}
            <div class="flex items-center gap-2">
              <GlobeIcon class="size-4" />
              {languages.find((it) => it.value === settings.language)?.label}
            </div>
          {/snippet}
        </SelectGroup> -->
        <SelectGroup
          options={themes}
          value={settings.theme}
          onChange={(value) => {
            settings.theme = value
            setMode(value as 'system' | 'light' | 'dark')
            sync()
          }}
        >
          {#snippet placeholder()}
            <div class="flex items-center gap-2">
              {#if settings.theme === 'system'}
                <SunMoonIcon class="size-4" />
              {:else if settings.theme === 'light'}
                <SunIcon class="size-4" />
              {:else}
                <MoonIcon class="size-4" />
              {/if}
              {themes.find((it) => it.value === settings.theme)?.label}
            </div>
          {/snippet}
        </SelectGroup>
      </div>
    </div>
  </div>
</footer>
