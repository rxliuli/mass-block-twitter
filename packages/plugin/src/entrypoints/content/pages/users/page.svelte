<script lang="ts">
  import { dbApi, type Tweet, type User } from '$lib/db'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { Input } from '$lib/components/ui/input'
  import { filterUser, type SearchParams } from './utils/filterUser'
  import SelectFilter from './components/SelectFilter.svelte'
  import { type LabelValue } from './components/SelectFilter.types'
  import {
    extractCurrentUserId,
    extractTweet,
    removeTweets,
  } from '$lib/observe'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { blockUser, ExpectedError, searchPeople, unblockUser } from '$lib/api'
  import { debounce, groupBy } from 'lodash-es'
  import { buttonVariants } from '$lib/components/ui/button'
  import {
    DownloadIcon,
    EyeIcon,
    ImportIcon,
    MenuIcon,
    ShieldBanIcon,
    ShieldCheckIcon,
  } from 'lucide-svelte'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { fileSelector } from '$lib/util/fileSelector'
  import { toast } from 'svelte-sonner'
  import saveAs from 'file-saver'
  import { Parser } from '@json2csv/plainjs'
  import { serializeError } from 'serialize-error'
  import { AsyncArray } from '@liuli-util/async'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { shadcnConfig } from '$lib/components/logic/config'
  import TableExtraButton from '$lib/components/logic/TableExtraButton.svelte'
  import { ulid } from 'ulidx'
  import { navigate } from '$lib/components/logic/router'
  import { userColumns } from './utils/columns'
  import { t } from '$lib/i18n'

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
  const onScroll = (event: UIEvent) => {
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
  const filterBlockedOptions: LabelValue<SearchParams['filterBlocked']>[] = [
    { value: 'all', label: $t('search-and-block.filter.all') },
    { value: 'blocked', label: $t('search-and-block.filter.blocking.blocked') },
    {
      value: 'unblocked',
      label: $t('search-and-block.filter.blocking.unblocked'),
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
          ? $t('search-and-block.toast.blocking')
          : $t('search-and-block.toast.unblocking'),
      )
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText =
          action === 'block'
            ? $t('search-and-block.toast.blocking')
            : $t('search-and-block.toast.unblocking')
        try {
          toast.loading(
            $t('search-and-block.toast.blockingProgress', {
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
    },
  })

  function onExport() {
    const parser = new Parser({
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    const csv = parser.parse(selectedRows)
    saveAs(new Blob([csv]), `block_list_${new Date().toISOString()}.csv`)
    toast.success(
      $t('search-and-block.toast.exportSuccess', {
        values: {
          count: selectedRows.length,
        },
      }),
      { duration: 5000 },
    )
  }

  async function onImportBlockList() {
    const files = await fileSelector({
      accept: '.csv',
    })
    if (!files) return
    const csv = await files[0].text()
    const users = (
      parse(csv, {
        columns: [
          'id',
          'screen_name',
          'name',
          'description',
          'profile_image_url',
        ],
      }) as User[]
    ).slice(1)
    const allUsers = await dbApi.users.getAll()
    const allIds = new Set(
      allUsers.filter((it) => it.blocking).map((it) => it.id),
    )
    const newUsers = users.filter((it) => !allIds.has(it.id))
    await dbApi.users.record(
      newUsers.map(
        (it) =>
          ({
            ...it,
            blocking: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as User,
      ),
    )
    await $mutation.mutateAsync({ users: newUsers, action: 'block' })
    toast.info(
      $t('search-and-block.toast.importSuccess', {
        values: {
          new: newUsers.length,
          ignored: users.length - newUsers.length,
        },
      }),
    )
  }

  async function onBlock() {
    const users = selectedRows.filter((it) => !it.blocking)
    const grouped = groupBy(users, (it) => it.following)
    let blockList: User[] = users
    if ((grouped.true ?? []).length > 0) {
      const confirmed = confirm($t('search-and-block.confirm.blockFollowing'))
      if (!confirmed) {
        blockList = grouped.false ?? []
      }
    }
    await $mutation.mutateAsync({ users: blockList, action: 'block' })
    const elements = document.querySelectorAll(
      '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
    ) as NodeListOf<HTMLElement>
    const blockUserIds = blockList.map((it) => it.id)
    const tweets = await AsyncArray.map([...elements], async (it) => {
      const { tweetId } = extractTweet(it)
      const tweet = await dbApi.tweets.get(tweetId)
      return tweet
    })
    const tweetsToRemove = tweets.filter(
      (it) => it && blockUserIds.includes(it.user_id),
    ) as Tweet[]
    removeTweets(tweetsToRemove.map((it) => it.id))
  }

  function onUnblock() {
    const users = selectedRows.filter((it) => it.blocking)
    $mutation.mutateAsync({ users, action: 'unblock' })
  }

  function onViewBlockedUsers() {
    navigate('/search-and-block/blocked')
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
      onclick={onBlock}
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
          <DropdownMenu.Item onclick={onImportBlockList}>
            <ImportIcon class="w-4 h-4" />
            {$t('search-and-block.actions.importBlockList')}
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
      label={$t('search-and-block.filter.blocking')}
      options={filterBlockedOptions}
      bind:value={searchParams.filterBlocked}
    />
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
