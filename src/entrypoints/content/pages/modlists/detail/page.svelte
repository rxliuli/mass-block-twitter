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
    ModListUpdateRequest,
    ModListUsersPageResponse,
  } from '@mass-block-twitter/server'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    EllipsisIcon,
    PencilIcon,
    Trash2Icon,
    UserPlusIcon,
  } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import ModlistUser from './components/ModlistUser.svelte'
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

  const route = useRoute()

  const metadata = createQuery({
    queryKey: ['modlistMetadata'],
    queryFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await fetch(
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
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await fetch(
        `${SERVER_URL}/api/modlists/subscribe/${route.search?.get('id')}`,
        {
          method: 'POST',
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
    },
    onError: () => {
      toast.error('Subscribe modlist failed')
    },
  })
  const unsubscribeMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await fetch(
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
    },
    onError: async (error) => {
      toast.error('Unsubscribe modlist failed')
    },
  })
  const deleteMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await fetch(
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
      const resp = await fetch(
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

  const query = createInfiniteQuery({
    queryKey: ['modlistUsers'],
    queryFn: async ({ pageParam }) => {
      const authInfo = await getAuthInfo()
      const url = new URL(`${SERVER_URL}/api/modlists/users`)
      url.searchParams.set('modListId', route.search?.get('id')!)
      if (pageParam) {
        url.searchParams.set('cursor', pageParam)
      }
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${authInfo?.token}` },
      })
      return (await resp.json()) as ModListUsersPageResponse
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
  })
  const queryClient = useQueryClient()
  const addUserMutation = createMutation({
    mutationFn: async (user: User) => {
      const resp = await fetch(`${SERVER_URL}/api/modlists/user`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (await getAuthInfo())?.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modListId: route.search?.get('id')!,
          twitterUser: user,
        } satisfies ModListAddTwitterUserRequest),
      })
      if (!resp.ok) {
        throw new Error('Failed to add user')
      }
      const data = (await resp.json()) as ModListAddTwitterUserResponse
      queryClient.setQueryData(
        ['modlistUsers'],
        produce((old: typeof $query.data) => {
          old?.pages.forEach((page) => {
            page.data.push(data)
          })
        }),
      )
    },
    onSuccess: () => {
      toast.success('Added to list')
    },
    onError: () => {
      toast.error('Add to list failed')
    },
  })
  const { loadings, withLoading } = useLoading()
  const removeUserMutation = createMutation({
    mutationFn: withLoading(
      async (twitterUserId: string) => {
        const resp = await fetch(`${SERVER_URL}/api/modlists/user`, {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + (await getAuthInfo())?.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modListId: route.search?.get('id')!,
            twitterUserId: twitterUserId,
          } satisfies ModListRemoveTwitterUserRequest),
        })
        if (!resp.ok) {
          throw new Error('Failed to remove user')
        }
        queryClient.setQueryData(
          ['modlistUsers'],
          produce((old: typeof $query.data) => {
            old?.pages.forEach((page) => {
              page.data = page.data.filter((it) => it.id !== twitterUserId)
            })
          }),
        )
      },
      (twitterUserId) => twitterUserId,
    ),
    onSuccess: () => {
      toast.success('Removed from list')
    },
    onError: () => {
      toast.error('Remove from list failed')
    },
  })
  let userAddOpen = $state(false)
  async function onOpenUserAdd() {
    userAddOpen = true
  }
  const authInfo = useAuthInfo()
</script>

<LayoutNav title="Moderation Lists Detail">
  {#if $metadata.data?.subscribed}
    <Button
      variant="destructive"
      onclick={() => $unsubscribeMutation.mutate()}
      disabled={!authInfo.value || $unsubscribeMutation.isPending}
    >
      Unsubscribe
    </Button>
  {:else}
    <Button
      onclick={() => $subscribeMutation.mutate()}
      disabled={!authInfo.value || $subscribeMutation.isPending}
    >
      Subscribe
    </Button>
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

<div class="max-w-3xl mx-auto">
  {#if $metadata.isLoading}
    <QueryLoading />
  {:else if $metadata.data}
    <ModlistDesc modlist={$metadata.data}>
      {#snippet actions()}
        <Button
          variant="ghost"
          class="text-blue-400 flex items-center gap-2"
          onclick={onOpenUserAdd}
          disabled={!authInfo.value}
        >
          <UserPlusIcon class="h-4 w-4" />
          Add people
        </Button>
      {/snippet}
    </ModlistDesc>
  {:else}
    <QueryError description={'Load modlist detail failed'} />
  {/if}

  {#if $query.data}
    {@const users = $query.data.pages.flatMap((it) => it.data) ?? []}
    {#if users.length === 0}
      <div class="text-center text-zinc-400">No users in this list</div>
    {:else}
      <div class="divide-y">
        {#each users as user (user.id)}
          <ModlistUser {user}>
            {#snippet actions()}
              {#if $metadata.data?.owner}
                <Button
                  variant="secondary"
                  onclick={(ev) => {
                    ev.preventDefault()
                    $removeUserMutation.mutate(user.id)
                  }}
                  disabled={loadings[user.id]}
                >
                  Remove
                </Button>
              {/if}
            {/snippet}
          </ModlistUser>
        {/each}
      </div>
    {/if}
  {/if}
  {#if $query.isLoading}
    <QueryLoading />
  {:else if $query.error}
    <QueryError description={'Load modlist users failed'} />
  {/if}
</div>

<ModListEdit
  bind:open={metadataEditOpen}
  title="Edit Moderation List"
  data={$metadata.data}
  onSave={$updateModlist.mutateAsync}
/>

<ModlistAddUser
  bind:open={userAddOpen}
  modListId={$metadata.data?.id ?? ''}
  onAdd={$addUserMutation.mutateAsync}
  onRemove={(user) => $removeUserMutation.mutateAsync(user.id)}
/>
