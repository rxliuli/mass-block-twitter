<script lang="ts">
  import {
    ADataTable,
    renderComponent,
  } from '$lib/components/logic/a-data-table'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { SERVER_URL } from '$lib/constants'
  import type {
    LlmAnalyzeResponse,
    ReviewUsersRequest,
    ReviewUsersResponse,
  } from '@mass-block-twitter/server'
  import {
    createInfiniteQuery,
    createMutation,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import { TextWrapper } from '$lib/components/custom/text'
  import AnalyzeAction from './components/AnalyzeAction.svelte'
  import { toast } from 'svelte-sonner'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { LinkIcon, MenuIcon, SearchIcon } from 'lucide-svelte'
  import { navigate } from '$lib/components/logic/router'
  import { shadcnConfig } from '$lib/components/logic/config'
  import SelectGroup from '$lib/components/custom/select/SelectGroup.svelte'
  import { batchExecute } from '$lib/util/batch'
  import { middleware } from '$lib/util/middleware'
  import { useController } from '$lib/stores/controller'
  import { errorHandler, loadingHandler } from '$lib/util/handlers'
  import { useScroll } from '$lib/components/logic/query'
  import ScreenNameWrapper from '../search-and-block/components/ScreenNameWrapper.svelte'

  let status = $state<ReviewUsersRequest['status']>('unanalyzed')
  const query = createInfiniteQuery({
    queryKey: ['analyze'],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${SERVER_URL}/api/analyze/users`)
      url.searchParams.set('status', status)
      if (pageParam) {
        url.searchParams.set('cursor', pageParam)
      }
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ADMIN_TOKEN')}`,
        },
      })
      return (await resp.json()) as ReviewUsersResponse
    },
    getNextPageParam: (lastPage) => lastPage?.cursor,
    initialPageParam: undefined as string | undefined,
  })
  const { onScroll } = useScroll(() => $query)

  let selectedRowKeys = $state<string[]>([])

  const markMutation = createMutation({
    mutationFn: async (isSpam: boolean) => {
      const resp = await fetch(`${SERVER_URL}/api/analyze/users/spam`, {
        method: 'POST',
        body: JSON.stringify({
          userIds: selectedRowKeys,
          isSpamByManualReview: isSpam,
        }),
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ADMIN_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      })
      return resp.json()
    },
    onSuccess: () => {
      toast.success('Marked successfully')
      $query.refetch()
    },
  })

  const controller = useController()
  onDestroy(() => controller.abort())
  const analyzeMutation = createMutation({
    mutationFn: async () => {
      const toastId = toast.loading('Analyzing...')
      controller.create()
      const users = $query.data?.pages.flatMap((it) => it.data) ?? []
      try {
        await batchExecute({
          controller,
          getItems: () => selectedRowKeys,
          execute: async (userId) => {
            const resp = await fetch(`${SERVER_URL}/api/analyze/llm`, {
              method: 'POST',
              body: JSON.stringify({ userId }),
              headers: {
                Authorization: `Bearer ${localStorage.getItem('ADMIN_TOKEN')}`,
                'Content-Type': 'application/json',
              },
            })
            if (!resp.ok) {
              throw new Error('Failed to analyze')
            }
            const r = (await resp.json()) as LlmAnalyzeResponse
            const user = users?.find((it) => it.id === userId)
            console.log('analyze', user, r)
          },
          onProcessed: async (context) => {
            await middleware({
              context,
              toastId,
            })
              .use(errorHandler({ title: 'Failed to analyze' }))
              .use(loadingHandler({ title: 'Analyzing...' }))
              .run()
          },
        })
        toast.success('Analyzed successfully')
        $query.refetch()
      } finally {
        toast.dismiss(toastId)
      }
    },
  })

  const autoAnalyzeMutation = createMutation({
    mutationFn: async () => {
      const toastId = toast.loading('Analyzing...', {
        duration: 1000000,
      })
      controller.create()
      const getUsrIds = () =>
        $query.data?.pages.flatMap((it) => it.data).map((it) => it.id) ?? []
      try {
        await batchExecute({
          controller,
          concurrency: 10,
          getItems: getUsrIds,
          execute: async (userId) => {
            const resp = await fetch(`${SERVER_URL}/api/analyze/llm`, {
              method: 'POST',
              body: JSON.stringify({ userId }),
              headers: {
                Authorization: `Bearer ${localStorage.getItem('ADMIN_TOKEN')}`,
                'Content-Type': 'application/json',
              },
            })
            if (!resp.ok) {
              throw new Error('Failed to analyze')
            }
            const r = (await resp.json()) as LlmAnalyzeResponse
            const user = $query.data?.pages
              .flatMap((it) => it.data)
              ?.find((it) => it.id === userId)
            console.log('analyze', user, r.rating, r.explanation)
          },
          onProcessed: async (context) => {
            await middleware({
              context,
              toastId,
            })
              .use(errorHandler({ title: 'Failed to analyze' }))
              .use(loadingHandler({ title: 'Analyzing...' }))
              .use(async ({ context }) => {
                if (context.index % 50 === 0) {
                  await $query.fetchNextPage()
                }
              })
              .run()
          },
        })
        toast.success('Analyzed successfully')
        $query.refetch()
      } finally {
        toast.dismiss(toastId)
      }
    },
  })

  const queryClient = useQueryClient()
</script>

<div class="h-full">
  <header class="sticky top-0 bg-background flex gap-2 justify-end pb-1">
    <SelectGroup
      options={[
        {
          label: 'Unanalyzed',
          value: 'unanalyzed',
        },
        {
          label: 'Unreviewed',
          value: 'unreviewed',
        },
        {
          label: 'Reviewed',
          value: 'reviewed',
        },
      ]}
      bind:value={status}
      onChange={() => {
        queryClient.resetQueries({ queryKey: ['analyze'] })
      }}
      class="w-40"
    />
    <Button
      variant="secondary"
      onclick={() => {
        queryClient.resetQueries({ queryKey: ['analyze'] })
      }}>Refresh</Button
    >

    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
      >
        <MenuIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
        <DropdownMenu.Group>
          <DropdownMenu.Item onclick={() => $markMutation.mutate(true)}>
            Mark Spam
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => $markMutation.mutate(false)}>
            Mark Not Spam
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => $analyzeMutation.mutate()}>
            Analyze(Selected)
          </DropdownMenu.Item>

          <DropdownMenu.Item onclick={() => $autoAnalyzeMutation.mutate()}>
            Analyze(Auto)
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item
            onclick={() => navigate('/analyze/search-twitter')}
          >
            <LinkIcon color={'gray'} class="w-4 h-4" />
            Search Twitter
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </header>
  <div class="h-[calc(100%-2rem)]">
    <ADataTable
      dataSource={$query.data?.pages.flatMap((page) => page.data) ?? []}
      columns={[
        {
          title: 'ID',
          dataIndex: 'id',
        },
        {
          title: 'Screen Name',
          dataIndex: 'screenName',
          render: (value) =>
            renderComponent(ScreenNameWrapper, {
              children: value,
              class: 'text-sm truncate',
            }),
        },
        {
          title: 'Name',
          dataIndex: 'name',
          render: (value) =>
            renderComponent(TextWrapper, {
              children: value,
              class: 'text-sm truncate',
            }),
        },
        {
          title: 'Followers',
          dataIndex: 'followersCount',
        },
        {
          title: 'Spam',
          dataIndex: 'isSpamByManualReview',
          render: (value) => (value ? 'Yes' : 'No'),
        },
        {
          title: 'Rating',
          dataIndex: 'llmSpamRating',
        },
        {
          title: 'Explanation',
          dataIndex: 'llmSpamExplanation',
          render: (value) =>
            renderComponent(TextWrapper, {
              class: 'text-sm truncate',
              children: value,
            }),
        },
      ]}
      rowKey="id"
      rowSelection={{
        selectedRowKeys,
        onChange: (values) => (selectedRowKeys = values),
      }}
      {onScroll}
    />
  </div>
</div>
