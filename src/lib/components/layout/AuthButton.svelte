<script lang="ts">
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo'
  import { openLoginWindow } from '$lib/util/openLoginWindow'
  import { toast } from 'svelte-sonner'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { UserIcon } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge'
  import * as DropdownMenu from '../ui/dropdown-menu'
  import { Button } from '../ui/button'
  import { shadcnConfig } from '../logic/config'
  import { createMutation } from '@tanstack/svelte-query'
  import { SERVER_URL } from '$lib/constants'

  const authInfo = useAuthInfo()

  let interval = $state<number>()
  const webUrl =
    import.meta.env.VITE_WEB_URL ?? 'https://mass-block-twitter.rxliuli.com'
  function onLogin() {
    openLoginWindow(webUrl + '/accounts/login?from=plugin')
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
    window.open(webUrl + '/accounts/settings', '_blank')
  }

  const logoutMutation = createMutation({
    mutationFn: async () => {
      const resp = await fetch(SERVER_URL + '/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${$authInfo?.token}` },
      })
      if (!resp.ok) {
        throw new Error('Failed to logout')
      }
      authInfo.set(null)
    },
    onSuccess: () => {
      toast.success('Logged out')
    },
  })
</script>

{#if $authInfo}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Sidebar.MenuButton>
        <UserIcon />
        <span class="truncate">{$authInfo.email}</span>
        {#if $authInfo.isPro}
          <Badge variant="outline">pro</Badge>
        {/if}
      </Sidebar.MenuButton>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
      <DropdownMenu.Item onclick={onGotoSettings}>Profile</DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => $logoutMutation.mutate()}>
        Logout
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Sidebar.MenuButton onclick={onLogin}>
    <UserIcon />
    <span>Login</span>
  </Sidebar.MenuButton>
{/if}
