<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import {
    createInfiniteQuery,
    createMutation,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import type {
    ModListAddTwitterUserRequest,
    ModListAddTwitterUserResponse,
    ModListAddTwitterUsersRequest,
    ModListAddTwitterUsersResponse,
    ModListRemoveTwitterUserRequest,
    ModListUsersPageResponse,
  } from '@mass-block-twitter/server'
  import { Button } from '$lib/components/ui/button'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import {
    QueryError,
    QueryLoading,
    useLoading,
  } from '$lib/components/logic/query'
  import { SERVER_URL } from '$lib/constants'
  import { toast } from 'svelte-sonner'
  import { type User } from '$lib/db'
  import { produce } from 'immer'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { crossFetch } from '$lib/query'
  import ModlistUserItem from './ModlistUserItem.svelte'
  import ModlistAddUser from './ModlistAddUser.svelte'

  let {
    owner,
    ref = $bindable(),
  }: {
    owner: boolean
    ref?: {
      onOpenUserAdd: () => void
    }
  } = $props()

  ref = {
    onOpenUserAdd: () => {
      userAddOpen = true
    },
  }

  const route = useRoute()
  const query = createInfiniteQuery({
    queryKey: ['modlistUsers', route.search?.get('id')],
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
        ['modlistUsers', route.search?.get('id')],
        produce((old: typeof $query.data) => {
          old?.pages[0]?.data.unshift({
            ...data,
            modListUserId: data.id,
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
  const addUsersMutation = createMutation({
    mutationFn: async (users: User[]) => {
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/users`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (await getAuthInfo())?.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modListId: route.search?.get('id')!,
          twitterUsers: users,
        } satisfies ModListAddTwitterUsersRequest),
      })
      if (!resp.ok) {
        throw new Error('Failed to add user')
      }
      const data = (await resp.json()) as ModListAddTwitterUsersResponse
      if (!$query.data) {
        await $query.refetch()
        return
      }
      queryClient.setQueryData(
        ['modlistUsers', route.search?.get('id')],
        produce((old: typeof $query.data) => {
          old?.pages[0]?.data.unshift(
            ...data.map((it) => ({
              ...it,
              modListUserId: it.id,
            })),
          )
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
          ['modlistUsers', route.search?.get('id')],
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
            dynamic
            onscroll={onScroll}
          >
            {#snippet child(item)}
              <ModlistUserItem user={item}>
                {#snippet actions()}
                  {#if owner}
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
              </ModlistUserItem>
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

<ModlistAddUser
  bind:open={userAddOpen}
  modListId={route.search?.get('id')!}
  onAdd={$addUserMutation.mutateAsync}
  onAddUsers={$addUsersMutation.mutateAsync}
  onRemove={(user) => $removeUserMutation.mutateAsync(user.id)}
/>
