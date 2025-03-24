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
  import { useModlistUsers } from '../utils/useModlistUsers'
  import { t } from '$lib/i18n'
  import { selectImportFile } from '$lib/hooks/batchBlockUsers'
  import { Input } from '$lib/components/ui/input';

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

  let searchQuery = $state('')

  const route = useRoute()
  const query = $derived(useModlistUsers(route.search?.get('id')!, searchQuery))
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
    const toastId = toast.info($t('modlists.detail.users.import.importing'), {
      action: {
        label: $t('modlists.detail.users.import.stop'),
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
        toast.info(
          $t('modlists.detail.users.import.progress', {
            values: {
              count,
              total: allCount,
            },
          }),
          {
            id: toastId,
            action: {
              label: $t('modlists.detail.users.import.stop'),
              onClick: () => {
                abortController.abort()
              },
            },
          },
        )
      }
      toast.dismiss(toastId)
      toast.success(
        $t('modlists.detail.users.import.success', {
          values: {
            count,
            total: allCount,
          },
        }),
      )
    } catch (err) {
      toast.dismiss(toastId)
      toast.error($t('modlists.detail.users.import.failed'))
    }
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
      toast.success($t('modlists.detail.users.remove.success'))
    },
    onError: () => {
      toast.error($t('modlists.detail.users.remove.failed'))
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

<div class="flex-1 overflow-y-hidden p-1">
  <Input
    placeholder={$t('modlists.detail.users.search')}
    bind:value={searchQuery}
    class="mb-4 max-w-3xl mx-auto"
  />
  <AutoSizer>
    {#snippet child({ height })}
      {#if $query.data}
        {@const users = $query.data.pages.flatMap((it) => it.data) ?? []}
        {#if users.length === 0}
          {#if !$query.isFetching}
            <div class="text-center text-zinc-400">
              {$t('modlists.detail.users.empty')}
            </div>
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
                      {$t('modlists.detail.users.remove')}
                    </Button>
                  {/if}
                {/snippet}
              </ModlistUserItem>
            {/snippet}
          </List>
        {/if}
      {:else if $query.isError}
        <QueryError />
      {:else}
        <QueryLoading />
      {/if}
    {/snippet}
  </AutoSizer>
</div>

<ModlistAddUser
  bind:open={userAddOpen}
  modListId={route.search?.get('id')!}
  onAddUsers={$innerAddUsersMutation.mutateAsync}
  onRemove={(user) => $removeUserMutation.mutateAsync(user.id)}
/>
