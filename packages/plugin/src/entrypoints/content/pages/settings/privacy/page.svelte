<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Trash2Icon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { t } from '$lib/i18n'
  import { dbApi } from '$lib/db'

  async function onClearCache() {
    // console.log('clear cache')
    const toastId = toast.loading('Clearing cache...', {
      duration: Number.POSITIVE_INFINITY,
    })
    try {
      await dbApi.clear()
      // await Promise.all([deleteDB('keyval-store'), deleteDB('mass-db')])
      localStorage.clear()
      toast.success($t('settings.privacy.clearAllCache.success'), {
        duration: 3000,
        onAutoClose: () => {
          location.reload()
        },
        onDismiss: () => {
          location.reload()
        },
      })
    } finally {
      toast.dismiss(toastId)
    }
  }
</script>

<LayoutNav title={$t('settings.privacy.title')} />

<div class="max-w-3xl mx-auto">
  <div class="flex items-center gap-4 py-4 cursor-pointer">
    <div class="flex-1">
      <span class="block text-base font-medium">
        {$t('settings.privacy.clearAllCache.title')}
      </span>
      <span class="block mt-1 text-sm text-gray-500">
        {$t('settings.privacy.clearAllCache.description')}
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
