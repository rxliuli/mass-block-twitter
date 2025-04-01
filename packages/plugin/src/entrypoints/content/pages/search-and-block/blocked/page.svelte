<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import Button from '$lib/components/ui/button/button.svelte'
  import { DownloadIcon, ShieldCheckIcon, UploadIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { blockUser, unblockUser } from '$lib/api/twitter'
  import { t, tP } from '$lib/i18n'
  import { getBlockedUsers } from '$lib/api/twitter'
  import { useController } from '$lib/stores/controller'
  import { batchExecute } from '$lib/util/batch'
  import { userColumns } from '../utils/columns'
  import {
    batchExportBlockedUsers,
    onBatchUnblockProcessed,
  } from './utils/batchExportBlockedUsers'
  import {
    batchBlockUsersMutation,
    selectImportFile,
  } from '$lib/hooks/batchBlockUsers'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { useScroll } from '$lib/components/logic/query'

  let hasNextPage = $state(true) // TODO @tanstack/svelte-query's bug, after check
  const query = createInfiniteQuery({
    queryKey: ['blocked-users'],
    queryFn: async ({ pageParam }) => {
      const r = await getBlockedUsers({
        cursor: pageParam,
        count: 20,
      })
      hasNextPage = !!r.cursor
      return r
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  onMount(async () => {
    let first = true
    while (getUsers().length < 40 && (first || hasNextPage)) {
      first = false
      await $query.fetchNextPage()
    }
  })

  let selectedRowKeys = $state<string[]>([])
  const { onScroll } = useScroll(() => $query)

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
      await batchExportBlockedUsers({
        controller,
        getItems: getUsers,
        hasNext: () => hasNextPage,
        fetchNextPage: () => $query.fetchNextPage(),
      })
    },
  })

  const authInfo = useAuthInfo()
  const importMutation = createMutation({
    mutationFn: async () => {
      const users = await selectImportFile()
      if (!users || users.length === 0) {
        return
      }
      controller.create()
      await batchBlockUsersMutation({
        controller,
        users: () => users,
        blockUser,
        getAuthInfo: async () => authInfo.value!,
        onProcessed: async () => {},
      })
    },
  })
</script>

<LayoutNav title={$t('blocked-users.title')} />

<div class="h-full flex flex-col">
  <header class="flex items-center gap-2 justify-end">
    <Button
      variant="outline"
      onclick={() => $unblockMutation.mutate()}
      disabled={$unblockMutation.isPending ||
        $query.isFetching ||
        selectedRowKeys.length === 0}
    >
      <ShieldCheckIcon />
      <span class="hidden md:block">{$t('blocked-users.actions.unblock')}</span>
    </Button>
    <Button
      variant={'outline'}
      disabled={$exportMutation.isPending || $query.isFetching}
      onclick={() => $exportMutation.mutate()}
    >
      <DownloadIcon />
      <span class="hidden md:block">{$t('blocked-users.actions.export')}</span>
    </Button>
    <Button
      variant="outline"
      onclick={() => $importMutation.mutate()}
      disabled={$importMutation.isPending || $query.isFetching}
    >
      <UploadIcon />
      <span class="hidden md:block">{$t('blocked-users.actions.import')}</span>
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
