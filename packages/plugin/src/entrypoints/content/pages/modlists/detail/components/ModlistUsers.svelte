<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import {
    createInfiniteQuery,
    createMutation,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import type {
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
  import { fileSelector } from '$lib/util/fileSelector'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { chunk } from 'lodash-es'

  let {
    owner,
    ref = $bindable(),
  }: {
    owner: boolean
    ref?: {
      onOpenUserAdd: () => void
      onImportUsers: () => void
    }
  } = $props()

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

  const innerAddUsersMutation = createMutation({
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
          const oldData = (old?.pages[0]?.data ?? []).map((it) => it.id)
          const newData = data.filter((it) => !oldData.includes(it.id))
          if (oldData.length === 0) {
            $query.refetch()
            return
          }
          old?.pages[0]?.data.unshift(
            ...newData.map((it) => ({
              ...it,
              modListUserId: it.id,
            })),
          )
        }),
      )
    },
  })

  const onImportUsers = async () => {
    const users = await selectImportFile()
    if (!users) {
      return
    }
    const allCount = users.length
    const abortController = new AbortController()
    const toastId = toast.info('Importing users...', {
      action: {
        label: 'Stop',
        onClick: () => {
          abortController.abort()
        },
      },
    })
    let count = 0
    try {
      for (const it of chunk(users, 50)) {
        if (abortController.signal.aborted) {
          break
        }
        await $innerAddUsersMutation.mutateAsync(it)
        count += it.length
        toast.info(`Imported ${count}/${allCount} users...`, {
          id: toastId,
          action: {
            label: 'Stop',
            onClick: () => {
              abortController.abort()
            },
          },
        })
      }
      toast.dismiss(toastId)
      toast.success(`Imported ${count}/${allCount} users successfully`)
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Failed to import users')
    }
  }

  async function selectImportFile() {
    const files = await fileSelector({
      accept: '.json, .csv',
    })
    if (!files) {
      return
    }
    const str = await files[0].text()
    let users: User[]
    if (files[0].name.endsWith('.json')) {
      users = JSON.parse(str) as User[]
    } else {
      try {
        users = (
          parse(str, {
            columns: [
              'id',
              'screen_name',
              'name',
              'description',
              'profile_image_url',
            ],
          }) as User[]
        ).slice(1)
      } catch (err) {
        toast.error(
          'Your import file is not valid, check includes id, screen_name, name, description, profile_image_url',
        )
        return
      }
    }
    if (users.length === 0) {
      toast.error('No users to import')
      return
    }
    for (const it of users) {
      if (!(it.id && it.screen_name && it.name && it.profile_image_url)) {
        toast.error(
          'Your import file is not valid, check includes id, screen_name, name, description, profile_image_url',
        )
        return
      }
    }
    const confirmed = confirm(
      `Are you sure you want to import ${users.length} users?`,
    )
    if (!confirmed) {
      return
    }
    return users
  }

  ref = {
    onOpenUserAdd: () => {
      userAddOpen = true
    },
    onImportUsers: onImportUsers,
  }

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
  onAddUsers={$innerAddUsersMutation.mutateAsync}
  onRemove={(user) => $removeUserMutation.mutateAsync(user.id)}
/>
