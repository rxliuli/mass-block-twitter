<script lang="ts" generics="T extends User">
  import { type User } from '$lib/db'
  import { useController } from '$lib/stores/controller'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'
  import { onExportUsersProcessed } from '../hooks/onExportUsers'
  import { tP } from '$lib/i18n'
  import { batchQuery } from '$lib/util/batch'
  import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
  import { toast } from 'svelte-sonner'
  import { FileDownIcon, ShieldBanIcon } from 'lucide-svelte'
  import * as Command from '$lib/components/ui/command'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { blockUser } from '$lib/api/twitter'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'

  let {
    onclick,
    getProps,
  }: {
    onclick?: () => void
    getProps: () => {
      queryKey: string | string[]
      queryFn: (options: { cursor?: string }) => Promise<{
        data: T[]
        cursor?: string
      }>
      getTotal: () => Promise<number>
      downloadFileName: () => string
      name: string
      blockUser?: (user: T) => Promise<void | 'skip'>
      maxQueryCount?: number
    }
  } = $props()

  const { name, queryKey, queryFn, getTotal, downloadFileName, ..._props } =
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
              maxQueryCount: _props.maxQueryCount,
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

  const authInfo = useAuthInfo()
  const blockUsersMutation = createMutation({
    mutationFn: async () => {
      if ($blockUsersMutation.isPending) {
        return
      }

      const [total, _] = await Promise.all([getTotal(), $query.fetchNextPage()])
      // console.log('onMount after', getUsers())
      controller.create()
      await batchBlockUsersMutation({
        controller,
        users: () => $query.data?.pages.flatMap((it) => it.data) ?? [],
        total: total,
        blockUser: async (user) => {
          if (user.following) {
            return 'skip'
          }
          return await (_props.blockUser ?? blockUser)(user)
        },
        getAuthInfo: async () => authInfo.value!,
        onProcessed: async (user, meta) => {
          console.log(
            `[batchBlockMutation] onProcesssed ${meta.index} ${user.screen_name} ` +
              new Date().toISOString(),
          )
          if (meta.index % 10 === 0) {
            if (!$query.isPending) {
              await $query.fetchNextPage()
            }
          }
        },
      })
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
  <span>Export {name}</span>
</Command.Item>

<Command.Item
  onclick={() => {
    $blockUsersMutation.mutate()
    onclick?.()
  }}
  disabled={$query.isFetching || $blockUsersMutation.isPending}
>
  <ShieldBanIcon color={'red'} />
  <span>Block {name}</span>
</Command.Item>
