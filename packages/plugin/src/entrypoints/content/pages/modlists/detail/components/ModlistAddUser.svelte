<script lang="ts">
  import { searchPeople } from '$lib/api'
  import { shadcnConfig } from '$lib/components/logic/config'
  import {
    QueryError,
    QueryLoading,
    useLoading,
  } from '$lib/components/logic/query'
  import * as Avatar from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { SERVER_URL } from '$lib/constants'
  import { type User } from '$lib/db'
  import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import {
    createInfiniteQuery,
    createMutation,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import { debounce } from 'lodash-es'
  import type {
    ModListUserCheckPostRequest,
    ModListUserCheckResponse,
  } from '@mass-block-twitter/server'
  import { produce } from 'immer'
  import { toast } from 'svelte-sonner'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { crossFetch } from '$lib/query'
  import { cn } from '$lib/utils'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import {
    MultipleSelectAll,
    MultipleSelectCheckbox,
    MultipleSelectRoot,
  } from '$lib/components/custom/multiple-select'
  import { Input } from '$lib/components/ui/input'
  import { ThreeCheckbox } from '$lib/components/custom/checkbox'

  let {
    open = $bindable(false),
    modListId,
    ...props
  }: {
    open: boolean
    modListId: string
    onAdd: (user: User) => Promise<void>
    onAddUsers: (users: User[]) => Promise<void>
    onRemove: (user: User) => Promise<void>
  } = $props()

  function onCancel() {
    open = false
    searchTerm = ''
    $query.refetch()
  }

  const query = createInfiniteQuery({
    queryKey: ['modlistAddUser', 'search'],
    queryFn: async ({ pageParam }) => {
      const term = searchTerm.trim()
      if (!term) {
        return {
          cursor: undefined,
          data: [],
        }
      }
      let twitterPage: {
        cursor: string
        data: User[]
      }
      try {
        twitterPage = await searchPeople({
          term,
          count: 20,
          cursor: pageParam,
        })
      } catch (err) {
        if (err instanceof Response && err.status === 429) {
          toast.error('Rate limit exceeded, please try again later')
        }
        throw err
      }
      if (twitterPage.data.length === 0) {
        return {
          cursor: undefined,
          data: [],
        }
      }
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/user/check`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (await getAuthInfo())?.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modListId,
          users: twitterPage.data,
        } satisfies ModListUserCheckPostRequest),
      })
      const data = (await resp.json()) as ModListUserCheckResponse
      return {
        cursor: twitterPage.cursor,
        data: twitterPage.data.map((it) => ({
          ...it,
          added: data[it.id],
        })),
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
    retry: false,
  })

  const { loadings, withLoading } = useLoading()

  const queryClient = useQueryClient()

  function updateUser(userIds: string[], added: boolean) {
    queryClient.setQueryData(
      ['modlistAddUser', 'search'],
      produce((old: typeof $query.data) => {
        if (!old) {
          return old
        }
        old.pages.forEach((page) => {
          page.data.forEach((it) => {
            if (userIds.includes(it.id)) {
              it.added = added
            }
          })
        })
        return old
      }),
    )
  }

  const addUserMutation = createMutation({
    mutationFn: withLoading(
      async (user: User) => {
        await props.onAdd(user)
        updateUser([user.id], true)
      },
      (user) => user.id,
    ),
    onError: () => {
      toast.error('Failed to add user')
    },
  })
  const removeUserMutation = createMutation({
    mutationFn: withLoading(
      async (user: User) => {
        await props.onRemove(user)
        updateUser([user.id], false)
      },
      (user) => user.id,
    ),
    onError: () => {
      toast.error('Failed to remove user')
    },
  })

  let isCompositionOn = $state(false)
  let searchTerm = $state('')
  const onSearch = debounce(() => {
    if (isCompositionOn) {
      return
    }
    $query.refetch()
  }, 500)

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

  let selected = $state<string[]>([])

  const addUsersMutation = createMutation({
    mutationFn: withLoading(
      async (users: (User & { added: boolean })[]) => {
        const addUsers = users.filter((it) => !it.added)
        if (addUsers.length === 0) {
          toast.error('No users to add')
          return
        }
        await props.onAddUsers(addUsers)
        updateUser(
          addUsers.map((it) => it.id),
          true,
        )
        selected = []
      },
      (users) => users.map((it) => it.id),
    ),
    onError: () => {
      toast.error('Failed to add user')
    },
  })
  // const removeUsersMutation = createMutation({
  //   mutationFn: withLoading(
  //     async (users: User[]) => {
  //       // await props.onRemoveUsers(users)
  //       users.map((it) => updateUser(it.id, false))
  //     },
  //     (users) => users.map((it) => it.id),
  //   ),
  //   onError: () => {
  //     toast.error('Failed to remove user')
  //   },
  // })

  const selectedUsers = $derived.by(() => {
    return (
      $query.data?.pages
        .flatMap((page) => page.data)
        .filter((it) => selected.includes(it.id)) ?? []
    )
  })
</script>

<MultipleSelectRoot
  keys={$query.data?.pages.flatMap((page) => page.data).map((it) => it.id) ??
    []}
  bind:selected
>
  <Dialog.Root bind:open>
    <Dialog.Content
      class="w-full max-w-3xl"
      portalProps={{ to: shadcnConfig.get().portal }}
      trapFocus={false}
    >
      <Dialog.Header>
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2">
          <MultipleSelectAll>
            {#snippet child({ mode, onclick })}
              <ThreeCheckbox checked={mode} {onclick} />
            {/snippet}
          </MultipleSelectAll>
          <Input
            autofocus
            bind:value={searchTerm}
            oninput={onSearch}
            placeholder="Search for user"
            oncompositionstart={() => (isCompositionOn = true)}
            oncompositionend={() => (isCompositionOn = false)}
          />
          <Button
            variant="secondary"
            onclick={() => $addUsersMutation.mutate(selectedUsers)}
          >
            Add
          </Button>
        </div>
      </Dialog.Header>
      <div class="h-[60dvh] space-y-2 overflow-y-auto">
        {#if $query.data}
          {@const users = $query.data?.pages.flatMap((page) => page.data) ?? []}
          {#if users.length === 0}
            {#if !$query.isFetching}
              <div class="text-center text-zinc-400">No results found for</div>
            {/if}
          {/if}

          <AutoSizer>
            {#snippet child({ height })}
              <List
                data={users}
                itemKey={'id'}
                itemHeight={54}
                class={cn('divide-y', {
                  'divide-y-0': users.length === 0,
                })}
                {height}
                onscroll={onScroll}
              >
                {#snippet child(user)}
                  <div
                    class="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg"
                  >
                    <MultipleSelectCheckbox key={user.id}>
                      {#snippet child({ checked, onclick })}
                        <Checkbox {checked} {onclick} />
                      {/snippet}
                    </MultipleSelectCheckbox>
                    <Avatar.Root>
                      <Avatar.Image
                        src={user.profile_image_url}
                        title={user.name}
                      />
                      <Avatar.Fallback>
                        {user.name.slice(0, 2)}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div class="flex-1 overflow-x-hidden">
                      <div
                        class="text-sm font-medium overflow-x-hidden truncate"
                      >
                        {user.name}
                      </div>
                      <div
                        class="text-xs text-muted-foreground overflow-x-hidden truncate"
                      >
                        @{user.screen_name}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onclick={() =>
                        user.added
                          ? $removeUserMutation.mutate(user)
                          : $addUserMutation.mutate(user)}
                      disabled={loadings[user.id]}
                    >
                      {user.added ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                {/snippet}
              </List>
            {/snippet}
          </AutoSizer>
        {/if}
        <div class="sticky bottom-0">
          {#if $query.isFetching}
            <QueryLoading class="h-auto" />
          {:else if $query.isError}
            <QueryError description="Failed to search users" />
          {/if}
        </div>
      </div>

      <Dialog.Footer>
        <Button class="w-full" variant="secondary" onclick={onCancel}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</MultipleSelectRoot>
