<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import {
    createInfiniteQuery,
    createMutation,
    createQuery,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import type {
    ModList,
    ModListAddTwitterUserRequest,
    ModListAddTwitterUserResponse,
    ModListGetResponse,
    ModListRemoveErrorResponse,
    ModListRemoveTwitterUserRequest,
    ModListSubscribeRequest,
    ModListUpdateRequest,
    ModListUsersPageResponse,
  } from '@mass-block-twitter/server'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    BanIcon,
    EllipsisIcon,
    ListFilterPlusIcon,
    MessageCircleOffIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    UserPlusIcon,
  } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import ModlistDesc from './components/ModlistDesc.svelte'
  import {
    QueryError,
    QueryLoading,
    useLoading,
  } from '$lib/components/logic/query'
  import { SERVER_URL } from '$lib/constants'
  import ModListEdit from '../components/ModListEdit.svelte'
  import { toast } from 'svelte-sonner'
  import { goBack } from '$lib/components/logic/router/route.svelte'
  import ModlistAddUser from './components/ModlistAddUser.svelte'
  import { type User } from '$lib/db'
  import { produce } from 'immer'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { refreshModListSubscribedUsers } from '$lib/content'
  import { crossFetch } from '$lib/query'
  import * as Tabs from '$lib/components/ui/tabs'
  import ModlistUsers from './components/ModlistUsers.svelte'
  import ModlistRules from './components/ModlistRules.svelte'
  import { cn } from '$lib/utils'

  const route = useRoute()

  const metadata = createQuery({
    queryKey: ['modlistMetadata', route.search?.get('id')],
    queryFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/get/${route.search?.get('id')}`,
        {
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      return (await resp.json()) as ModListGetResponse
    },
  })

  const subscribeMutation = createMutation({
    mutationFn: async (action: ModListSubscribeRequest['action']) => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/subscribe/${route.search?.get('id')}`,
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
    },
    onSuccess: async () => {
      await $metadata.refetch()
      refreshModListSubscribedUsers(true)
    },
    onError: () => {
      toast.error('Subscribe modlist failed')
    },
  })
  const unsubscribeMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
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
      toast.error('Unsubscribe modlist failed')
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
      toast.success('Delete modlist success')
      goBack()
    },
    onError: async (error) => {
      if (error instanceof Response) {
        const data = (await error.json()) as ModListRemoveErrorResponse
        if (data.code === 'modListNotFound') {
          toast.error('Modlist not found')
          return
        }
        if (data.code === 'modListHasSubscriptions') {
          toast.error('Modlist has subscriptions')
          return
        }
      }
      toast.error('Delete modlist failed')
    },
  })
  let metadataEditOpen = $state(false)
  function onOpenEdit() {
    metadataEditOpen = true
  }
  const updateModlist = createMutation({
    mutationFn: async (
      modlist: Pick<ModList, 'name' | 'description' | 'avatar'>,
    ) => {
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
      toast.success('Update modlist success')
      await $metadata.refetch()
    },
    onError: () => {
      toast.error('Update modlist failed')
    },
  })
  const authInfo = useAuthInfo()

  let currentTab = $state<'users' | 'rules'>('users')
  let usersRef = $state<{
    onOpenUserAdd: () => void
  }>()
  let rulesRef = $state<{
    onOpenRuleEdit: () => void
  }>()
</script>

<LayoutNav title="Moderation Lists Detail">
  {#if $metadata.data?.subscribed}
    <Button
      variant="outline"
      onclick={() => $unsubscribeMutation.mutate()}
      disabled={!authInfo.value || $unsubscribeMutation.isPending}
    >
      {$metadata.data.action === 'block' ? 'Unblock' : 'Unmute'}
    </Button>
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={!authInfo.value || $subscribeMutation.isPending}
      >
        Subscribe
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('hide')}>
          Mute accounts <MessageCircleOffIcon class="w-4 h-4" />
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('block')}>
          Block accounts <BanIcon class="w-4 h-4" />
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
      <!-- <DropdownMenu.Item>
        Copy Link to list
        <DropdownMenu.Shortcut>
          <ShareIcon />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item> -->
      <DropdownMenu.Item disabled={!$metadata.data?.owner} onclick={onOpenEdit}>
        Edit list details
        <DropdownMenu.Shortcut>
          <PencilIcon />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        disabled={!$metadata.data?.owner}
        onclick={() => $deleteMutation.mutate()}
      >
        Delete list
        <DropdownMenu.Shortcut>
          <Trash2Icon />
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
                <Tabs.Trigger value="users">Users</Tabs.Trigger>
                <Tabs.Trigger value="rules">Rules</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            <Button
              variant="ghost"
              class={cn('text-blue-400 flex items-center gap-2', {
                hidden: currentTab !== 'users',
              })}
              onclick={() => usersRef?.onOpenUserAdd()}
              disabled={!$metadata.data.owner}
            >
              <UserPlusIcon class="h-4 w-4" />
              Add people
            </Button>
            <Button
              variant="ghost"
              class={cn('text-blue-400 flex items-center gap-2', {
                hidden: currentTab !== 'rules',
              })}
              onclick={() => rulesRef?.onOpenRuleEdit()}
              disabled={!$metadata.data.owner}
            >
              <ListFilterPlusIcon class="h-4 w-4" />
              Add rule
            </Button>
          </div>
        {/snippet}
      </ModlistDesc>
    {:else}
      <QueryError description={'Load modlist detail failed'} />
    {/if}
  </div>

  {#if currentTab === 'users'}
    <ModlistUsers owner={!!$metadata.data?.owner} bind:ref={usersRef} />
  {:else}
    <ModlistRules owner={!!$metadata.data?.owner} bind:ref={rulesRef} />
  {/if}
</div>

<ModListEdit
  bind:open={metadataEditOpen}
  title="Edit Moderation List"
  data={$metadata.data}
  onSave={$updateModlist.mutateAsync}
/>
