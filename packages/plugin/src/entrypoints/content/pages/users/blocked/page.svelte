<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { dbApi, User } from '$lib/db'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { userColumns } from '../utils/columns'
  import Button from '$lib/components/ui/button/button.svelte'
  import { ShieldCheckIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { serializeError } from 'serialize-error'
  import { blockUser, unblockUser } from '$lib/api'
  import { ulid } from 'ulidx'

  const query = createInfiniteQuery({
    queryKey: ['blocked-users'],
    queryFn: async ({ pageParam }) => {
      const r = await dbApi.users.getByPage({
        limit: 100,
        cursor: pageParam,
      })
      return r
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  let selectedRowKeys = $state<string[]>([])
  function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (Math.abs(scrollHeight - scrollTop - clientHeight) <= 1) {
      if ($query.hasNextPage && !$query.isFetchingNextPage) {
        $query.fetchNextPage()
      }
    }
  }

  const mutation = createMutation({
    mutationFn: async ({
      users,
      action,
    }: {
      users: User[]
      action: 'block' | 'unblock'
    }) => {
      let failedNames: string[] = []
      const loadingId = toast.loading(
        action === 'block' ? 'Blocking users...' : 'Unblocking users...',
      )
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText = action === 'block' ? 'blocking' : 'unblocking'
        try {
          toast.loading(
            `[${i + 1}/${users.length}] ${blockingText} ${it.name}...`,
            { id: loadingId },
          )
          if (action === 'block') {
            await blockUser(it)
            await dbApi.users.block(it)
            await dbApi.activitys.record([
              {
                id: ulid().toString(),
                action: 'block',
                trigger_type: 'manual',
                match_type: 'user',
                match_filter: 'batchSelected',
                user_id: it.id,
                user_name: it.name,
                user_screen_name: it.screen_name,
                user_profile_image_url: it.profile_image_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
          } else {
            await unblockUser(it.id)
            await dbApi.users.unblock(it)
          }
        } catch (e) {
          failedNames.push(it.name)
          console.log(`${blockingText} ${it.id} ${it.name} failed`, e)
          toast.error(
            `[${i + 1}/${users.length}] ${blockingText} ${it.name} failed`,
            {
              description: serializeError(e).message,
            },
          )
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        `${users.length - failedNames.length} users ${
          action === 'block' ? 'blocked' : 'unblocked'
        }, ${failedNames.length} failed`,
        {
          description: failedNames.join(', '),
          duration: 5000,
        },
      )
    },
    onSuccess: async () => {
      await $query.refetch()
      selectedRowKeys = []
    },
  })

  async function onUnblock() {
    const users =
      $query.data?.pages
        .flatMap((it) => it.data)
        .filter((it) => selectedRowKeys.includes(it.id)) ?? []
    if (users.length === 0) {
      toast.error('No users selected')
      return
    }
    await $mutation.mutateAsync({ users, action: 'unblock' })
  }
</script>

<LayoutNav title="Blocked Users" />

<div class="h-full flex flex-col">
  <header class="flex items-center gap-2 justify-end">
    <Button
      variant="outline"
      onclick={onUnblock}
      disabled={$mutation.isPending}
    >
      <ShieldCheckIcon color={'gray'} class="w-4 h-4" />
      Unblock
    </Button>
  </header>
  <div class="flex-1 overflow-y-auto">
    <ADataTable
      columns={userColumns}
      dataSource={$query.data?.pages.flatMap((it) => it.data) ?? []}
      rowKey="id"
      rowSelection={{
        selectedRowKeys,
        onChange: (values) => (selectedRowKeys = values),
      }}
      virtual
      {onScroll}
      loading={$query.isFetching}
    />
  </div>
</div>
