<script lang="ts">
  import { useAuthInfo } from '$lib/hooks/useAuthInfo'
  import { openLoginWindow } from '$lib/util/openLoginWindow'
  import { toast } from 'svelte-sonner'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { UserIcon } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge'

  const authInfo = useAuthInfo()

  let interval = $state<number>()
  function onLogin() {
    openLoginWindow(
      import.meta.env.VITE_LOGIN_URL ??
        'https://mass-block-twitter.rxliuli.com/accounts/login?from=plugin',
    )
    if (interval) {
      clearInterval(interval)
    }
    interval = setInterval(async () => {
      const info = await authInfo.getValue()
      if (!info) {
        return
      }
      clearInterval(interval)
      toast.success('Login successful')
    }, 1000) as unknown as number
  }

  onDestroy(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  function onGotoSettings() {
    window.open(
      'https://mass-block-twitter.rxliuli.com/accounts/settings',
      '_blank',
    )
  }
</script>

{#if $authInfo}
  <Sidebar.MenuButton onclick={onGotoSettings}>
    <UserIcon />
    <span class="truncate">{$authInfo.email}</span>
    {#if $authInfo.isPro}
      <Badge variant="outline">pro</Badge>
    {/if}
  </Sidebar.MenuButton>
{:else}
  <Sidebar.MenuButton onclick={onLogin}>
    <UserIcon />
    <span>Login</span>
  </Sidebar.MenuButton>
{/if}
