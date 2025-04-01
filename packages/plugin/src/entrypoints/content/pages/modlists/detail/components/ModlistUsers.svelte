<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import { createMutation, useQueryClient } from '@tanstack/svelte-query'
  import type {
    ModListAddTwitterUsersRequest,
    ModListAddTwitterUsersResponse,
    ModListRemoveTwitterUserRequest,
  } from '@mass-block-twitter/server'
  import { Button } from '$lib/components/ui/button'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import {
    QueryError,
    QueryLoading,
    useLoading,
    useScroll,
  } from '$lib/components/logic/query'
  import { SERVER_URL } from '$lib/constants'
  import { toast } from 'svelte-sonner'
  import { type User } from '$lib/db'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { crossFetch } from '$lib/query'
  import ModlistUserItem from './ModlistUserItem.svelte'
  import ModlistAddUser from './ModlistAddUser.svelte'
  import { chunk, debounce } from 'es-toolkit'
  import { useModlistUsers } from '../utils/useModlistUsers'
  import { t } from '$lib/i18n'
  import { selectImportFile } from '$lib/hooks/batchBlockUsers'
  import { Input } from '$lib/components/ui/input'
  import { cn } from '$lib/utils'

  let {
    owner,
    subscribed,
    ref = $bindable(),
  }: {
    owner: boolean
    subscribed: boolean
    ref?: {
      onOpenUserAdd: () => void
      onImportUsers: () => void
    }
  } = $props()

  let searchQuery = $state('')
  let isCompositionOn = $state(false)
  const onSearch = debounce((event: Event) => {
    if (isCompositionOn) {
      return
    }
    $query.refetch()
  }, 500)

  const route = useRoute()
  const query = useModlistUsers(route.search?.get('id')!, () => searchQuery)
  const queryClient = useQueryClient()

  let init = $state(false)
  $effect(() => {
    if ($query.status === 'success' && !init) {
      init = true
    }
  })

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
      queryClient.invalidateQueries({
        queryKey: ['modlistUsers', route.search?.get('id')],
      })
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
        queryClient.invalidateQueries({
          queryKey: ['modlistUsers', route.search?.get('id')],
        })
        // queryClient.setQueryData(
        //   ['modlistUsers', route.search?.get('id')],
        //   produce((old: typeof $query.data) => {
        //     old?.pages.forEach((page) => {
        //       page.data = page.data.filter((it) => it.id !== twitterUserId)
        //     })
        //   }),
        // )
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

  const { onScroll } = useScroll(() => $query)
</script>

<div class="flex-1 overflow-y-hidden p-1">
  <Input
    placeholder={$t('modlists.detail.users.search')}
    bind:value={searchQuery}
    oninput={onSearch}
    oncompositionstart={() => (isCompositionOn = true)}
    oncompositionend={() => (isCompositionOn = false)}
    class={cn('mb-4 max-w-3xl mx-auto', !init && 'hidden')}
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
  {subscribed}
  modListId={route.search?.get('id')!}
  onAddUsers={$innerAddUsersMutation.mutateAsync}
  onRemove={(user) => $removeUserMutation.mutateAsync(user.id)}
/>
