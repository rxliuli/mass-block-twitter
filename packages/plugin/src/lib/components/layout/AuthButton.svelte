<script lang="ts">
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { openLoginWindow } from '$lib/util/openLoginWindow'
  import { toast } from 'svelte-sonner'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { CircleFadingArrowUpIcon, LoaderCircle, UserIcon } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge'
  import * as DropdownMenu from '../ui/dropdown-menu'
  import { shadcnConfig } from '../logic/config'
  import { createMutation, useQueryClient } from '@tanstack/svelte-query'
  import { SERVER_URL } from '$lib/constants'
  import { crossFetch } from '$lib/query'
  import * as localModlistSubscriptions from '$lib/localModlistSubscriptions'
  import { type ModListSubscribeRequest } from '@mass-block-twitter/server';
  import { t } from '$lib/i18n'

  const authInfo = useAuthInfo()

  let interval = $state<number>()
  const webUrl =
    import.meta.env.VITE_API_URL ?? 'https://mass-block-twitter.rxliuli.com'
  const queryClient = useQueryClient()
  const loginMutation = createMutation({
    mutationFn: async () => {
      openLoginWindow(webUrl + '/accounts/login?from=plugin')
      if (interval) {
        clearInterval(interval)
      }
      
      return new Promise<void>((resolve, reject) => {
        interval = setInterval(async () => {
          try {
            const info = await authInfo.getValue()
            if (!info) {
              return
            }
            
            authInfo.value = info
            clearInterval(interval)
            
            const localSubs = await localModlistSubscriptions.getAllSubscriptions()
            for (const [modlistId, action] of Object.entries(localSubs)) {
              const resp = await crossFetch(
                `${SERVER_URL}/api/modlists/subscribe/${modlistId}`,
                {
                  method: 'POST',
                  body: JSON.stringify({ action } satisfies ModListSubscribeRequest),
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${info.token}`,
                  },
                },
              )
              if (!resp.ok) {
                toast.error($t('account.login.toast.subscribeLocal.failed', {values: {modlistId}}))
              }
            }
            resolve()
          } catch (error) {
            clearInterval(interval)
            reject(error)
          }
        }, 1000) as unknown as number
      });
    },
    onSuccess: () => {
      toast.success($t('account.login.success'))
      queryClient.refetchQueries()
    },
    onError: () => {
      toast.error($t('account.login.failed'))
    }
  })

  
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
        throw new Error($t('account.logout.failed'))
      }
      authInfo.value = null
    },
    onSuccess: () => {
      toast.success($t('account.logout.success'))
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
        {$t('account.upgrade.title')}
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
      <DropdownMenu.Item onclick={onGotoSettings}>
        {$t('account.profile.title')}
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => $logoutMutation.mutate()}>
        {$t('account.logout.title')}
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Sidebar.MenuItem>
    <Sidebar.MenuButton
      class="bg-blue-500 text-white hover:bg-blue-600 hover:text-white rounded-md transition-colors"
      onclick={() => $loginMutation.mutate()}
      disabled={$loginMutation.isPending}
    >
      {#if $loginMutation.isPending}
        <LoaderCircle class="animate-spin" />
      {:else}
        <UserIcon />
      {/if}
      <span>{$t('account.login.title')}</span>
    </Sidebar.MenuButton>
  </Sidebar.MenuItem>
{/if}
