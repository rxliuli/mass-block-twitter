<script lang="ts">
  import { type User } from '$lib/db'
  import { useController } from '$lib/stores/controller'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'
  import { onExportUsersProcessed } from '../hooks/onExportUsers'
  import { tP } from '$lib/i18n'
  import { batchQuery } from '$lib/util/batch'
  import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
  import { toast } from 'svelte-sonner'
  import { FileDownIcon } from 'lucide-svelte'
  import * as Command from '$lib/components/ui/command'

  let {
    onclick,
    getProps,
  }: {
    onclick?: () => void
    getProps: () => {
      queryKey: string | string[]
      queryFn: (options: { cursor?: string }) => Promise<{
        data: User[]
        cursor?: string
      }>
      title: string
      getTotal: () => Promise<number>
      downloadFileName: () => string
      name: string
    }
  } = $props()

  const { title, name, queryKey, queryFn, getTotal, downloadFileName } =
    getProps()

  const query = createInfiniteQuery({
    queryKey: [queryKey],
    queryFn: ({ pageParam }) => queryFn({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
    enabled: false,
  })
  const getUsers = () => $query.data?.pages.flatMap((it) => it.data) ?? []

  const controller = useController()
  onDestroy(() => controller.abort())

  const exportCsvMutation = createMutation({
    mutationFn: async () => {
      controller.create()
      const toastId = toast.loading('Exporting...')
      await $query.fetchNextPage()
      try {
        await batchQuery({
          controller,
          getItems: getUsers,
          total: await getTotal(),
          fetchNextPage: async () => $query.fetchNextPage(),
          hasNext: () => $query.hasNextPage,
          onProcessed: (context) =>
            onExportUsersProcessed({
              context,
              toastId,
              name,
            }),
        })
        toast.success('Export success', {
          duration: 1000000,
          description: `Exported ${getUsers().length} following`,
          action: {
            label: tP('common.actions.download'),
            onClick: () => {
              const users = getUsers()
              downloadUsersToCSV(users, downloadFileName())
            },
          },
        })
      } finally {
        toast.dismiss(toastId)
      }
    },
  })
</script>

<Command.Item
  onclick={() => {
    $exportCsvMutation.mutate()
    onclick?.()
  }}
  disabled={$query.isFetching || $exportCsvMutation.isPending}
>
  <FileDownIcon />
  <span>{title}</span>
</Command.Item>
