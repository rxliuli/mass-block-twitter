<script lang="ts">
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { openLoginWindow } from '$lib/util/openLoginWindow'
  import { toast } from 'svelte-sonner'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { CircleFadingArrowUpIcon, UserIcon } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge'
  import * as DropdownMenu from '../ui/dropdown-menu'
  import { shadcnConfig } from '../logic/config'
  import { createMutation, useQueryClient } from '@tanstack/svelte-query'
  import { SERVER_URL } from '$lib/constants'
  import { crossFetch } from '$lib/query'

  const authInfo = useAuthInfo()

  let interval = $state<number>()
  const webUrl =
    import.meta.env.VITE_WEB_URL ?? 'https://mass-block-twitter.rxliuli.com'
  const queryClient = useQueryClient()
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
      authInfo.value = info
      clearInterval(interval)
      toast.success('Login successful')
      queryClient.refetchQueries()
    }, 1000) as unknown as number
  }

  onDestroy(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  onMount(() => {
    const onTokenExpired = () => {
      authInfo.value = null
    }
    document.addEventListener('TokenExpired', onTokenExpired)
    return () => document.removeEventListener('TokenExpired', onTokenExpired)
  })

  function onGotoSettings() {
    window.open(webUrl + '/accounts/settings', '_blank')
  }

  const logoutMutation = createMutation({
    mutationFn: async () => {
      const resp = await crossFetch(SERVER_URL + '/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authInfo.value?.token}` },
      })
      if (!resp.ok) {
        throw new Error('Failed to logout')
      }
      authInfo.value = null
    },
    onSuccess: () => {
      toast.success('Logged out')
      queryClient.refetchQueries()
    },
  })

  function onOpenUpgrade(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    window.open(webUrl + '/pricing', '_blank')
  }
</script>

{#if authInfo.value}
  {#if !authInfo.value.isPro}
    <Sidebar.MenuItem>
      <Sidebar.MenuButton
        class="bg-blue-500 text-white hover:bg-blue-600 hover:text-white rounded-md transition-colors"
        onclick={onOpenUpgrade}
      >
        <CircleFadingArrowUpIcon />
        Upgrade
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  {/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          <UserIcon />
          <span class="truncate">{authInfo.value.email}</span>
          {#if authInfo.value.isPro}
            <Badge variant="outline">pro</Badge>
          {/if}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
      <DropdownMenu.Item onclick={onGotoSettings}>Profile</DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => $logoutMutation.mutate()}>
        Logout
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Sidebar.MenuItem onclick={onLogin}>
    <Sidebar.MenuButton
      class="bg-blue-500 text-white hover:bg-blue-600 hover:text-white rounded-md transition-colors"
    >
      <UserIcon />
      <span>Login</span>
    </Sidebar.MenuButton>
  </Sidebar.MenuItem>
{/if}
