<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { dbApi, type User } from '$lib/db'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { userColumns } from '../utils/columns'
  import Button from '$lib/components/ui/button/button.svelte'
  import { ShieldCheckIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { serializeError } from 'serialize-error'
  import { blockUser, unblockUser } from '$lib/api'
  import { ulid } from 'ulidx'
  import { t } from '$lib/i18n'

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
        action === 'block'
          ? $t('blocked-users.toast.blocking')
          : $t('blocked-users.toast.unblocking'),
      )
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText =
          action === 'block'
            ? $t('blocked-users.toast.blocking')
            : $t('blocked-users.toast.unblocking')
        try {
          toast.loading(
            $t('blocked-users.toast.blockingProgress', {
              values: {
                current: i + 1,
                total: users.length,
                action: blockingText,
                name: it.name,
              },
            }),
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
            $t('blocked-users.toast.blockingFailed', {
              values: {
                current: i + 1,
                total: users.length,
                action: blockingText,
                name: it.name,
              },
            }),
            {
              description: serializeError(e).message,
            },
          )
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        $t('blocked-users.toast.blockingSuccess', {
          values: {
            success: users.length - failedNames.length,
            failed: failedNames.length,
            action:
              action === 'block'
                ? $t('search-and-block.filter.blocking.blocked')
                : $t('search-and-block.filter.blocking.unblocked'),
          },
        }),
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
      toast.error($t('blocked-users.toast.noSelection'))
      return
    }
    await $mutation.mutateAsync({ users, action: 'unblock' })
  }

  const columns = $derived(
    userColumns.map((it) => ({
      ...it,
      title: $t(it.title),
    })),
  )
</script>

<LayoutNav title={$t('blocked-users.title')} />

<div class="h-full flex flex-col">
  <header class="flex items-center gap-2 justify-end">
    <Button
      variant="outline"
      onclick={onUnblock}
      disabled={$mutation.isPending}
    >
      <ShieldCheckIcon color={'gray'} class="w-4 h-4" />
      {$t('blocked-users.actions.unblock')}
    </Button>
  </header>
  <div class="flex-1 overflow-y-auto">
    <ADataTable
      columns={columns}
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
