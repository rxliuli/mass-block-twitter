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
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { refreshModListSubscribedUsers } from '$lib/content'
  import { crossFetch } from '$lib/query'

  const route = useRoute()

  const metadata = createQuery({
    queryKey: ['modlistMetadata'],
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
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
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

  const query = createInfiniteQuery({
    queryKey: ['modlistUsers'],
    queryFn: async ({ pageParam }) => {
      const authInfo = await getAuthInfo()
      const url = new URL(`${SERVER_URL}/api/modlists/users`)
      url.searchParams.set('modListId', route.search?.get('id')!)
      if (pageParam) {
        url.searchParams.set('cursor', pageParam)
      }
      const resp = await crossFetch(url, {
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
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/user`, {
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
      if (!$query.data) {
        await $query.refetch()
        return
      }
      queryClient.setQueryData(
        ['modlistUsers'],
        produce((old: typeof $query.data) => {
          old?.pages[0]?.data.unshift(data)
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
        const resp = await crossFetch(`${SERVER_URL}/api/modlists/user`, {
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

  function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (Math.abs(scrollHeight - scrollTop - clientHeight) <= 1) {
      requestAnimationFrame(() => {
        if ($query.hasNextPage) {
          $query.fetchNextPage()
        }
      })
    }
  }
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

<div class="max-w-3xl mx-auto h-full flex flex-col">
  {#if $metadata.isLoading}
    <QueryLoading />
  {:else if $metadata.data}
    <ModlistDesc modlist={$metadata.data}>
      {#snippet actions()}
        <Button
          variant="ghost"
          class="text-blue-400 flex items-center gap-2"
          onclick={onOpenUserAdd}
          disabled={!$metadata.data.owner}
        >
          <UserPlusIcon class="h-4 w-4" />
          Add people
        </Button>
      {/snippet}
    </ModlistDesc>
  {:else}
    <QueryError description={'Load modlist detail failed'} />
  {/if}

  <div class="flex-1 overflow-y-hidden">
    <AutoSizer>
      {#snippet child({ height })}
        {#if $query.data}
          {@const users = $query.data.pages.flatMap((it) => it.data) ?? []}
          {#if users.length === 0}
            {#if !$query.isFetching}
              <div class="text-center text-zinc-400">No users in this list</div>
            {/if}
          {:else}
            <List
              data={users}
              itemKey="id"
              itemHeight={100}
              {height}
              class="divide-y"
              dynamic
              onscroll={onScroll}
            >
              {#snippet child(item)}
                <ModlistUser user={item}>
                  {#snippet actions()}
                    {#if $metadata.data?.owner}
                      <Button
                        variant="secondary"
                        onclick={(ev) => {
                          ev.preventDefault()
                          $removeUserMutation.mutate(item.id)
                        }}
                        disabled={loadings[item.id]}
                      >
                        Remove
                      </Button>
                    {/if}
                  {/snippet}
                </ModlistUser>
              {/snippet}
            </List>
          {/if}
        {/if}
      {/snippet}
    </AutoSizer>
    <div class="sticky bottom-0">
      {#if $query.isFetching}
        <QueryLoading class="h-auto" />
      {:else if $query.error}
        <QueryError description={'Load modlist users failed'} />
      {/if}
    </div>
  </div>
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
