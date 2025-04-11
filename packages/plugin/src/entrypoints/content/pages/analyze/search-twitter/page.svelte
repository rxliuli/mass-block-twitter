<script lang="ts">
  import { searchPeople } from '$lib/api/twitter'
  import { InputSearch } from '$lib/components/custom/input'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Button } from '$lib/components/ui/button'
  import { SERVER_URL } from '$lib/constants'
  import {
    createInfiniteQuery,
    createMutation,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'
  import { userColumns } from '../../search-and-block/utils/columns'
  import { t } from '$lib/i18n'
  import { useScroll } from '$lib/components/logic/query'
  import type { CheckSpamUserRequest } from '@mass-block-twitter/server'
  import { chunk } from 'es-toolkit'
  import { batchExecute } from '$lib/util/batch'
  import { useController } from '$lib/stores/controller'
  import { middleware } from '$lib/util/middleware'
  import { loadingHandler } from '$lib/util/handlers'
  // import data from './assets/data.json'

  let term = $state('')

  const query = createInfiniteQuery({
    queryKey: ['analyze', 'search-twitter'],
    queryFn: async ({ pageParam }) => {
      term = term.trim()
      if (!term) {
        return {
          data: [],
          cursor: undefined,
        }
      }
      return await searchPeople({
        term,
        cursor: pageParam,
        count: 40,
      })
    },
    getNextPageParam: (lastPage) => lastPage?.cursor,
    initialPageParam: undefined as string | undefined,
  })

  let selectedRowKeys = $state<string[]>([])

  const controller = useController()
  onDestroy(() => controller.abort())
  const markMutation = createMutation({
    mutationFn: async (isSpam: boolean) => {
      const toastId = toast.loading('Marking...')
      try {
        controller.create()
        await batchExecute({
          controller,
          getItems: () => chunk(selectedRowKeys, 50),
          execute: async (chunks) => {
            const users = $query.data?.pages.flatMap((page) => page.data) ?? []
            const pendingUsers = users.filter((user) =>
              chunks.includes(user.id),
            )
            const checkResp = await fetch(
              SERVER_URL + '/api/twitter/spam-users/check',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                  pendingUsers.map((user) => ({
                    user,
                    tweets: [],
                  })) satisfies CheckSpamUserRequest,
                ),
              },
            )
            if (!checkResp.ok) {
              throw new Error('Failed to check spam')
            }
            const resp = await fetch(`${SERVER_URL}/api/analyze/users/spam`, {
              method: 'POST',
              body: JSON.stringify({
                userIds: chunks,
                isSpamByManualReview: isSpam,
              }),
              headers: {
                Authorization: `Bearer ${localStorage.getItem('ADMIN_TOKEN')}`,
                'Content-Type': 'application/json',
              },
            })
            if (!resp.ok) {
              throw new Error('Failed to mark spam')
            }
          },
          onProcessed: async (context) => {
            await middleware({
              context,
              toastId,
            })
              .use(loadingHandler({ title: 'Marking...' }))
              .run()
          },
        })
        toast.success('Marked successfully')
        selectedRowKeys = []
      } finally {
        toast.dismiss(toastId)
      }
    },
  })

  const columns = $derived.by(() => {
    const r = userColumns.map((column) => ({
      ...column,
      title: $t(column.title),
    }))
    r[3] = {
      dataIndex: 'followers_count',
      title: 'Followers',
    }
    return r
  })

  const queryClient = useQueryClient()
  const { onScroll } = useScroll(() => $query)
</script>

<div class="h-full">
  <header class="sticky top-0 bg-background flex gap-2 pb-1">
    <InputSearch
      class="flex-1"
      bind:value={term}
      onchange={() => {
        // $query.refetch()
        queryClient.resetQueries({ queryKey: ['analyze', 'search-twitter'] })
      }}
    />
    <Button variant="secondary" onclick={() => $markMutation.mutate(true)}
      >Mark Spam</Button
    >
    <Button variant="secondary" onclick={() => $markMutation.mutate(false)}
      >Mark Not Spam</Button
    >
  </header>
  <div class="h-[calc(100%-2rem)]">
    <ADataTable
      dataSource={$query.data?.pages.flatMap((page) => page.data) ?? []}
      {columns}
      rowKey="id"
      rowSelection={{
        selectedRowKeys,
        onChange: (values) => (selectedRowKeys = values),
      }}
      {onScroll}
    />
  </div>
</div>
