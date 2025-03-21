<script lang="ts">
  import { navigate } from '../../router'
  import { useOpen } from '$lib/stores/open.svelte'
  import { t } from '$lib/i18n'

  const openState = useOpen()

  function onOpenSettings(ev: MouseEvent) {
    ev.preventDefault()
    navigate('/settings/appearance')
    openState.openModal()
  }
</script>

<div>
  <h4>{$t('floatingButton.close.confirm.title')}</h4>
  <p>
    {$t('floatingButton.close.confirm.description.before')}
    <a
      href="/settings/appearance"
      class="text-blue-500"
      onclick={onOpenSettings}
    >
      {$t('settings.title')} &gt; {$t('settings.appearance.title')}
    </a>
    {$t('floatingButton.close.confirm.description.after')}
  </p>
</div>
