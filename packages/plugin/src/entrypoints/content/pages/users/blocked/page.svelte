<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { userColumns } from '../utils/columns'
  import Button from '$lib/components/ui/button/button.svelte'
  import { DownloadIcon, ShieldCheckIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { unblockUser } from '$lib/api/twitter'
  import { t, tP } from '$lib/i18n'
  import { getBlockedUsers } from '$lib/api/twitter'
  import { useController } from '$lib/stores/controller'
  import {
    onExportBlockedUsersProcessed,
    onBatchUnblockProcessed,
  } from '../utils/batchExportBlockedUsers'
  import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
  import { batchExecute, batchQuery } from '$lib/util/batch'

  const query = createInfiniteQuery({
    queryKey: ['blocked-users'],
    queryFn: async ({ pageParam }) => {
      const r = await getBlockedUsers({
        cursor: pageParam,
        count: 20,
      })
      // const r = await dbApi.users.getByPage({
      //   limit: 100,
      //   cursor: pageParam,
      // })
      return r
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  onMount(async () => {
    await $query.fetchNextPage()
    await $query.fetchNextPage()
  })

  let selectedRowKeys = $state<string[]>([])
  async function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (
      Math.abs(scrollHeight - scrollTop - clientHeight) <=
      window.innerHeight / 2
    ) {
      if ($query.hasNextPage && !$query.isFetchingNextPage) {
        await $query.fetchNextPage()
        await $query.fetchNextPage()
        await $query.fetchNextPage()
      }
    }
  }

  const controller = useController()
  onDestroy(controller.abort)

  const unblockMutation = createMutation({
    mutationFn: async () => {
      const users =
        $query.data?.pages
          .flatMap((it) => it.data)
          .filter((it) => selectedRowKeys.includes(it.id)) ?? []
      if (users.length === 0) {
        toast.error(tP('blocked-users.toast.noSelection'))
        return
      }
      controller.create()
      const toastId = toast.loading(tP('blocked-users.toast.unblocking'))
      try {
        const result = await batchExecute({
          controller,
          getItems: () => users,
          execute: async (it) => {
            await unblockUser(it.id)
          },
          onProcessed: (context) => onBatchUnblockProcessed(context, toastId),
        })
        toast.success(
          tP('blocked-users.toast.unblockingSuccess', {
            values: { success: result.success, failed: result.failed },
          }),
          { duration: 5000 },
        )
      } finally {
        toast.dismiss(toastId)
      }
    },
    onSuccess: async () => {
      selectedRowKeys = []
      await $query.refetch()
    },
  })

  const columns = $derived(
    userColumns.map((it) => ({
      ...it,
      title: $t(it.title),
    })),
  )

  const getUsers = () => $query.data?.pages.flatMap((it) => it.data) ?? []
  const exportMutation = createMutation({
    mutationFn: async () => {
      controller.create()
      const toastId = toast.loading('Starting export...')
      try {
        await batchQuery({
          controller,
          getItems: () => getUsers(),
          hasNext: () => $query.hasNextPage,
          fetchNextPage: () => $query.fetchNextPage(),
          onProcessed: (context) =>
            onExportBlockedUsersProcessed(context, toastId),
        })
        toast.success('Export success', {
          duration: 1000000,
          description: `Exported ${getUsers().length} blocked users`,
          cancel: undefined,
          action: {
            label: 'Download',
            onClick: () => {
              const users = getUsers()
              downloadUsersToCSV(users, 'blocked_users')
              toast.dismiss(toastId)
            },
          },
        })
      } finally {
        toast.dismiss(toastId)
      }
    },
  })
</script>

<LayoutNav title={$t('blocked-users.title')} />

<div class="h-full flex flex-col">
  <header class="flex items-center gap-2 justify-end">
    <Button
      variant={'outline'}
      disabled={$exportMutation.isPending || $query.isFetching}
      onclick={() => $exportMutation.mutate()}
    >
      <DownloadIcon class="w-4 h-4" />
      Export All
    </Button>
    <Button
      variant="outline"
      onclick={() => $unblockMutation.mutate()}
      disabled={$unblockMutation.isPending || $query.isFetching}
    >
      <ShieldCheckIcon class="w-4 h-4" />
      {$t('blocked-users.actions.unblock')}
    </Button>
  </header>
  <div class="flex-1 overflow-y-auto">
    <ADataTable
      {columns}
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
