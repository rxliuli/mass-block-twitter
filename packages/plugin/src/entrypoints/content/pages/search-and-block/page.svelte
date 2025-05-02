<script lang="ts">
  import { dbApi, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { filterUser, type SearchParams } from './utils/filterUser'
  import SelectFilter from './components/SelectFilter.svelte'
  import { type LabelValue } from './components/SelectFilter.types'
  import { extractCurrentUserId } from '$lib/observe'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { blockUser, unblockUser } from '$lib/api/twitter'
  import { debounce, groupBy } from 'es-toolkit'
  import { buttonVariants } from '$lib/components/ui/button'
  import {
    DownloadIcon,
    EyeIcon,
    MenuIcon,
    ShieldBanIcon,
    ShieldCheckIcon,
  } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { serializeError } from 'serialize-error'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { shadcnConfig } from '$lib/components/logic/config'
  import TableExtraButton from '$lib/components/logic/TableExtraButton.svelte'
  import { navigate } from '$lib/components/logic/router'
  import { userColumns } from './utils/columns'
  import { t } from '$lib/i18n'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { searchPeople } from '$lib/api/twitter'
  import { ExpectedError } from '$lib/api'
  import { useScroll } from '$lib/components/logic/query'
  import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
  import { useController } from '$lib/stores/controller'
  import { wait } from '@liuli-util/async'

  let term = $state('')
  const query = createInfiniteQuery({
    queryKey: ['searchAndBlock'],
    queryFn: async ({ pageParam }) => {
      term = term.trim()
      if (!term) {
        return {
          cursor: undefined,
          data: [],
        }
      }
      try {
        const twitterPage = await searchPeople({
          term,
          count: 40,
          cursor: pageParam,
        })
        return {
          cursor: twitterPage.cursor,
          data: twitterPage.data,
        }
      } catch (err) {
        if (err instanceof ExpectedError && err.code === 'rateLimit') {
          toast.error($t('search-and-block.error.rateLimit'))
        }
        throw err
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
    retry: false,
  })
  let isCompositionOn = $state(false)
  const onSearch = debounce(() => {
    if (isCompositionOn) {
      return
    }
    $query.refetch()
  }, 500)
  const { onScroll } = useScroll(() => $query)

  let selectedRowKeys = $state<string[]>([])
  let searchParams = $state<SearchParams>({
    filterBlocked: 'all',
    filterVerified: 'all',
    filterFollowed: 'unfollowed',
  })
  const filteredData = $derived.by(() => {
    const currentUserId = extractCurrentUserId()
    return (
      $query.data?.pages
        .flatMap((it) => it.data)
        .filter(
          (it) => it.id !== currentUserId && filterUser(it, searchParams),
        ) ?? []
    )
  })
  const selectedRows = $derived(
    filteredData.filter((it) => selectedRowKeys.includes(it.id)),
  )
  const filterVerifiedOptions: LabelValue<SearchParams['filterVerified']>[] = [
    { value: 'all', label: $t('search-and-block.filter.all') },
    {
      value: 'verified',
      label: $t('search-and-block.filter.verified.verified'),
    },
    {
      value: 'unverified',
      label: $t('search-and-block.filter.verified.unverified'),
    },
  ]
  const showFollowedOptions: LabelValue<SearchParams['filterFollowed']>[] = [
    { value: 'all', label: $t('search-and-block.filter.all') },
    {
      value: 'followed',
      label: $t('search-and-block.filter.followed.followed'),
    },
    {
      value: 'unfollowed',
      label: $t('search-and-block.filter.followed.unfollowed'),
    },
  ]

  const unBlockMutation = createMutation({
    mutationFn: async ({
      users,
    }: {
      users: User[]
      action: 'block' | 'unblock'
    }) => {
      let failedNames: string[] = []
      const loadingId = toast.loading($t('search-and-block.toast.unblocking'))
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText = $t('search-and-block.toast.unblocking')
        try {
          toast.loading(
            $t('search-and-block.toast.blockingProgress', {
              values: {
                current: i + 1,
                total: users.length,
                action: $t('search-and-block.toast.blockingProgress'),
                name: it.name,
              },
            }),
            { id: loadingId },
          )

          await unblockUser(it.id)
          await dbApi.users.unblock(it)
        } catch (e) {
          failedNames.push(it.name)
          console.log(`${blockingText} ${it.id} ${it.name} failed`, e)
          toast.error(
            $t('search-and-block.toast.blockingFailed', {
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
        $t('search-and-block.toast.blockingSuccess', {
          values: {
            success: users.length - failedNames.length,
            failed: failedNames.length,
            action: $t('search-and-block.filter.blocking.unblocked'),
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
    },
  })

  function onExport() {
    if (selectedRows.length === 0) {
      toast.info($t('search-and-block.toast.exportEmpty'))
      return
    }
    downloadUsersToCSV(
      selectedRows,
      `selected_list_${new Date().toISOString()}.csv`,
    )
    toast.success(
      $t('search-and-block.toast.exportSuccess', {
        values: {
          count: selectedRows.length,
        },
      }),
      { duration: 5000 },
    )
  }

  let controller = useController()
  onDestroy(() => controller.abort())

  const authInfo = useAuthInfo()

  const blockMutation = createMutation({
    mutationFn: async () => {
      controller.create()
      await batchBlockUsersMutation({
        controller,
        users: () => selectedRows,
        blockUser,
        getAuthInfo: async () => authInfo.value!,
        onProcessed: async (_, meta) => {
          if (
            meta.index === meta.total - 1 &&
            selectedRowKeys.length === filteredData.length
          ) {
            if ($query.hasNextPage) {
              await $query.fetchNextPage()
            }
          }
        },
      })
      await $query.refetch()
    },
  })

  function onUnblock() {
    const users = selectedRows.filter((it) => it.blocking)
    $unBlockMutation.mutateAsync({ users, action: 'unblock' })
  }

  function onViewBlockedUsers() {
    navigate('/search-and-block/blocked-users')
  }

  const columns = $derived(
    userColumns.map((it) => ({
      ...it,
      title: $t(it.title),
    })),
  )
</script>

<div class="h-full flex flex-col">
  <div class="flex gap-2 mb-2">
    <Input
      placeholder={$t('search-and-block.search.placeholder')}
      bind:value={term}
      oninput={onSearch}
      oncompositionstart={() => (isCompositionOn = true)}
      oncompositionend={() => (isCompositionOn = false)}
      class="flex-1"
    />
    <TableExtraButton
      onclick={$blockMutation.mutate}
      text={$t('search-and-block.actions.blockSelected')}
    >
      {#snippet icon()}
        <ShieldBanIcon color={'red'} class="w-4 h-4" />
      {/snippet}
    </TableExtraButton>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
      >
        <MenuIcon class="w-4 h-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
        <DropdownMenu.Group>
          <DropdownMenu.Item onclick={onUnblock}>
            <ShieldCheckIcon color={'gray'} class="w-4 h-4" />
            {$t('search-and-block.actions.unblockSelected')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={onExport}>
            <DownloadIcon class="w-4 h-4" />
            {$t('search-and-block.actions.exportSelected')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={onViewBlockedUsers}>
            <EyeIcon class="w-4 h-4" />
            {$t('search-and-block.actions.viewBlockedUsers')}
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
  <div class="hidden md:flex items-center gap-2 mb-2">
    <SelectFilter
      label={$t('search-and-block.filter.verified')}
      options={filterVerifiedOptions}
      bind:value={searchParams.filterVerified}
    />
    <SelectFilter
      label={$t('search-and-block.filter.followed')}
      options={showFollowedOptions}
      bind:value={searchParams.filterFollowed}
      class="w-36"
    />
  </div>
  <div class="flex-1 overflow-hidden">
    <ADataTable
      class="flex-1"
      {columns}
      dataSource={filteredData}
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
