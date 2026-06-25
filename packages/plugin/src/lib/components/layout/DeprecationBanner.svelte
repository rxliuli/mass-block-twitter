<script lang="ts">
  import { onMount } from 'svelte'
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import { XIcon } from 'lucide-svelte'
  import { t } from '$lib/i18n'
  import { cn } from '$lib/utils'

  let { class: className }: { class?: string } = $props()

  const STORAGE_KEY = 'deprecation-banner-dismissed'

  let dismissed = $state(true)

  onMount(async () => {
    const { [STORAGE_KEY]: value } = await browser.storage.local.get(STORAGE_KEY)
    dismissed = !!value
  })

  async function dismiss() {
    dismissed = true
    await browser.storage.local.set({ [STORAGE_KEY]: true })
  }
</script>

{#if !dismissed}
  <Alert
    class={cn("border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100 relative", className)}
  >
    <AlertTitle class="pr-8">{$t('deprecation.title')}</AlertTitle>
    <AlertDescription>
      {$t('deprecation.description.before')}
      <a
        href="https://store.rxliuli.com/extensions/twitter-blocker"
        target="_blank"
        class="underline font-semibold"
      >Twitter Blocker</a>
      +
      <a
        href="https://store.rxliuli.com/extensions/twitter-filter"
        target="_blank"
        class="underline font-semibold"
      >Twitter Filter</a>{$t('deprecation.description.after')}
      <a
        href="https://store.rxliuli.com/blog/mass-block-twitter-vs-twitter-blocker-filter"
        target="_blank"
        class="underline ml-1"
      >
        {$t('deprecation.learnMore')}
      </a>
    </AlertDescription>
    <Button
      variant="ghost"
      size="icon"
      class="absolute top-1 right-1 h-6 w-6 text-amber-900 hover:text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:text-amber-50 dark:hover:bg-amber-800"
      onclick={dismiss}
    >
      <XIcon class="w-3 h-3" />
      <span class="sr-only">{$t('deprecation.dismiss')}</span>
    </Button>
  </Alert>
{/if}
