<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import type {
    ModListGetResponse,
    ModListRemoveErrorResponse,
    ModListSubscribeRequest,
    ModListSubscribeResponse,
    ModListUpdateRequest,
  } from '@mass-block-twitter/server'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    BanIcon,
    EllipsisIcon,
    ImportIcon,
    ListFilterPlusIcon,
    MessageCircleOffIcon,
    PencilIcon,
    ShareIcon,
    Trash2Icon,
    UserPlusIcon,
  } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import ModlistDesc from './components/ModlistDesc.svelte'
  import { QueryError, QueryLoading } from '$lib/components/logic/query'
  import { SERVER_URL } from '$lib/constants'
  import ModListEdit from '../components/ModListEdit.svelte'
  import { toast } from 'svelte-sonner'
  import { goBack } from '$lib/components/logic/router/route.svelte'
  import { refreshModListSubscribedUsers } from '$lib/content'
  import { crossFetch } from '$lib/query'
  import * as Tabs from '$lib/components/ui/tabs'
  import ModlistUsers from './components/ModlistUsers.svelte'
  import ModlistRules from './components/ModlistRules.svelte'
  import { cn } from '$lib/utils'
  import { type User } from '$lib/db'
  import { blockUser } from '$lib/api/twitter'
  import { useModlistUsers } from './utils/useModlistUsers'
  import * as localModlistSubscriptions from '$lib/localModlistSubscriptions'
  import { t } from '$lib/i18n'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'

  const route = useRoute()

  let controller = $state<AbortController>(new AbortController())
  onDestroy(() => {
    controller.abort()
  })
  const metadata = createQuery({
    queryKey: ['modlistMetadata', route.search?.get('id')],
    queryFn: async () => {
      const modListId = route.search?.get('id')
      if (!modListId) {
        return
      }
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/get/${modListId}`,
        {
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      const modlist = (await resp.json()) as ModListGetResponse
      if (!authInfo) {
        const subscription =
          await localModlistSubscriptions.getSubscription(modListId)
        if (subscription) {
          modlist.action = subscription
          modlist.subscribed = true
        }
      }
      return modlist
    },
  })
  const query = useModlistUsers(route.search?.get('id')!)
  const users = $derived.by(() =>
    ($query.data?.pages.flatMap((it) => it.data) ?? []).map(
      (it) =>
        ({
          id: it.id,
          screen_name: it.screenName,
          name: it.name,
          description: it.description,
          profile_image_url: it.profileImageUrl,
        }) as User,
    ),
  )
  const batchBlockMutation = createMutation({
    mutationFn: async () => {
      controller.abort()
      controller = new AbortController()
      await batchBlockUsersMutation({
        controller,
        users: () => users,
        blockUser,
        getAuthInfo: async () => authInfo.value!,
        onProcessed: async (_user, meta) => {
          if (meta.index % 10 === 0) {
            await $query.fetchNextPage()
          }
        },
      })
    },
  })

  const subscribeMutation = createMutation({
    mutationFn: async (action: ModListSubscribeRequest['action']) => {
      const modlistId = route.search?.get('id')!
      const authInfo = await getAuthInfo()
      if (!authInfo?.isPro) {
        let nSubscribed: number
        if (authInfo) {
          const subscribed = (await (
            await crossFetch(`${SERVER_URL}/api/modlists/subscribed/metadata`, {
              headers: {
                Authorization: `Bearer ${authInfo?.token}`,
              },
            })
          ).json()) as ModListSubscribeResponse
          nSubscribed = subscribed.length
        } else {
          nSubscribed = Object.keys(
            await localModlistSubscriptions.getAllSubscriptions(),
          ).length
        }
        if (nSubscribed >= 3) {
          toast.info($t('modlists.detail.toast.maxSubscribed'), {
            description: $t('modlists.detail.toast.maxSubscribedDesc'),
            action: {
              label: $t('modlists.detail.toast.upgradeNow'),
              onClick: () => {
                window.open('https://mass-block-twitter.rxliuli.com/pricing')
              },
            },
          })
        }
      }
      if (authInfo) {
        const resp = await crossFetch(
          `${SERVER_URL}/api/modlists/subscribe/${modlistId}`,
          {
            method: 'POST',
            body: JSON.stringify({ action } satisfies ModListSubscribeRequest),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authInfo?.token}`,
            },
          },
        )
        if (!resp.ok) {
          throw resp
        }
      } else {
        await localModlistSubscriptions.setSubscription(modlistId, action)
      }
    },
    onSuccess: async (_data, action) => {
      await $metadata.refetch()
      refreshModListSubscribedUsers(true)
      if (action === 'block') {
        const toastId = toast.success(
          $t('modlists.detail.toast.subscribe.success'),
          {
            description: $t(
              'modlists.detail.toast.subscribe.success.description',
            ),
            action: {
              label: $t('modlists.detail.toast.subscribe.success.action'),
              onClick: () => {
                toast.dismiss(toastId)
                $batchBlockMutation.mutate()
              },
            },
            cancel: {
              label: $t('modlists.detail.toast.subscribe.success.cancel'),
              onClick: () => {
                toast.dismiss(toastId)
              },
            },
          },
        )
      }
    },
    onError: () => {
      toast.error($t('modlists.detail.toast.subscribe.failed'))
    },
  })
  const unsubscribeMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      if (!authInfo) {
        await localModlistSubscriptions.removeSubscription(
          route.search?.get('id')!,
        )
        return
      }
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/subscribe/${route.search?.get('id')}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      await $metadata.refetch()
      refreshModListSubscribedUsers(true)
    },
    onError: async (error) => {
      toast.error($t('modlists.detail.toast.unsubscribe.failed'))
    },
  })
  const deleteMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/remove/${route.search?.get('id')}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      toast.success($t('modlists.detail.toast.delete.success'))
      goBack()
    },
    onError: async (error) => {
      if (error instanceof Response) {
        const data = (await error.json()) as ModListRemoveErrorResponse
        if (data.code === 'modListNotFound') {
          toast.error($t('modlists.detail.toast.delete.notFound'))
          return
        }
        if (data.code === 'modListHasSubscriptions') {
          toast.error($t('modlists.detail.toast.delete.hasSubscriptions'))
          return
        }
      }
      toast.error($t('modlists.detail.toast.delete.failed'))
    },
  })
  let metadataEditOpen = $state(false)
  function onOpenEdit() {
    metadataEditOpen = true
  }
  const updateModlist = createMutation({
    mutationFn: async (modlist: Omit<ModListUpdateRequest, 'twitterUser'>) => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/update/${route.search?.get('id')}`,
        {
          method: 'PUT',
          body: JSON.stringify(modlist satisfies ModListUpdateRequest),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      toast.success($t('modlists.detail.toast.update.success'))
      await $metadata.refetch()
    },
    onError: () => {
      toast.error($t('modlists.detail.toast.update.failed'))
    },
  })
  const authInfo = useAuthInfo()

  let currentTab = $state<'users' | 'rules'>('users')
  let usersRef = $state<{
    onOpenUserAdd: () => void
    onImportUsers: () => void
  }>()
  let rulesRef = $state<{
    onOpenRuleEdit: () => void
  }>()

  function onCopyLink() {
    const url = `https://mass-block-twitter.rxliuli.com/modlist/${route.search?.get('id')}`
    navigator.clipboard.writeText(url)
    toast.success($t('modlists.detail.toast.copyLink'), {
      description: url,
    })
  }
</script>

<LayoutNav title={$t('modlists.detail.title')}>
  {#if $metadata.data?.subscribed}
    <Button
      variant="outline"
      onclick={() => $unsubscribeMutation.mutate()}
      disabled={$unsubscribeMutation.isPending}
    >
      {$metadata.data.action === 'block'
        ? $t('modlists.detail.actions.unblock')
        : $t('modlists.detail.actions.unmute')}
    </Button>
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={$subscribeMutation.isPending}>
        {$t('modlists.detail.actions.subscribe')}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('hide')}>
          {$t('modlists.detail.actions.muteAccounts')}
          <MessageCircleOffIcon class="w-4 h-4" />
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('block')}>
          {$t('modlists.detail.actions.blockAccounts')}
          <BanIcon class="w-4 h-4" />
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="icon">
        <EllipsisIcon />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
      <DropdownMenu.Item onclick={onCopyLink}>
        {$t('modlists.detail.actions.copyLink')}
        <DropdownMenu.Shortcut>
          <ShareIcon class="text-blue-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => $batchBlockMutation.mutate()}>
        {$t('modlists.detail.actions.blockUsers')}
        <DropdownMenu.Shortcut>
          <BanIcon class="text-red-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item disabled={!$metadata.data?.owner} onclick={onOpenEdit}>
        {$t('modlists.detail.actions.editList')}
        <DropdownMenu.Shortcut>
          <PencilIcon class="text-blue-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        disabled={!$metadata.data?.owner}
        onclick={() => $deleteMutation.mutate()}
      >
        {$t('modlists.detail.actions.deleteList')}
        <DropdownMenu.Shortcut>
          <Trash2Icon class="text-red-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</LayoutNav>

<div class="h-full flex flex-col">
  <div class="w-full max-w-3xl mx-auto">
    {#if $metadata.isLoading}
      <QueryLoading />
    {:else if $metadata.data}
      <ModlistDesc modlist={$metadata.data}>
        {#snippet actions()}
          <div class="flex items-center justify-between">
            <Tabs.Root bind:value={currentTab}>
              <Tabs.List>
                <Tabs.Trigger value="users"
                  >{$t('modlists.detail.tabs.users')}</Tabs.Trigger
                >
                <Tabs.Trigger value="rules"
                  >{$t('modlists.detail.tabs.rules')}</Tabs.Trigger
                >
              </Tabs.List>
            </Tabs.Root>
            <div
              class={cn('flex items-center', {
                hidden: currentTab !== 'users',
              })}
            >
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => usersRef?.onImportUsers()}
                disabled={!$metadata.data?.owner}
              >
                <ImportIcon class="h-4 w-4" />
                {$t('modlists.detail.actions.importUsers')}
              </Button>
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => usersRef?.onOpenUserAdd()}
                disabled={!$metadata.data?.owner}
              >
                <UserPlusIcon class="h-4 w-4" />
                {$t('modlists.detail.actions.addUsers')}
              </Button>
            </div>
            <div
              class={cn('flex items-center', {
                hidden: currentTab !== 'rules',
              })}
            >
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => rulesRef?.onOpenRuleEdit()}
                disabled={!$metadata.data?.owner}
              >
                <ListFilterPlusIcon class="h-4 w-4" />
                {$t('modlists.detail.actions.addRule')}
              </Button>
            </div>
          </div>
        {/snippet}
      </ModlistDesc>
    {:else}
      <QueryError description={$t('modlists.detail.error.loadFailed')} />
    {/if}
  </div>

  {#if currentTab === 'users'}
    <ModlistUsers
      owner={!!$metadata.data?.owner}
      subscribed={!!$metadata.data?.subscribed}
      bind:ref={usersRef}
    />
  {:else}
    <ModlistRules
      owner={!!$metadata.data?.owner}
      subscribed={!!$metadata.data?.subscribed}
      bind:ref={rulesRef}
    />
  {/if}
</div>

<ModListEdit
  bind:open={metadataEditOpen}
  title={$t('modlists.detail.modal.edit.title')}
  data={$metadata.data!}
  onSave={$updateModlist.mutateAsync}
/>
