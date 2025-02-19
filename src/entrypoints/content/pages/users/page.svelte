<script lang="ts">
  import { type User } from '$lib/db'
  import { userQuery } from '../../../../lib/query'
  import { renderComponent } from '$lib/components/ui/data-table'
  import AvatarWrapper from './components/AvatarWrapper.svelte'
  import BlockingWrapper from './components/BlockingWrapper.svelte'
  import type { Column } from '$lib/components/logic/a-data-table'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import UserActions from './components/UserActions.svelte'
  import { Input } from '$lib/components/ui/input'
  import { filterUser, type SearchParams } from './utils/filterUser'
  import TextWrapper from './components/TextWrapper.svelte'
  import VerifiedWrapper from './components/VerifiedWrapper.svelte'
  import SelectFilter from './components/SelectFilter.svelte'
  import { type LabelValue } from './components/SelectFilter.types'
  import { extractCurrentUserId } from '$lib/observe'

  const query = userQuery()

  const columns: Column<User>[] = [
    {
      title: 'Avatar',
      dataIndex: 'profile_image_url',
      render: (value, record) =>
        renderComponent(AvatarWrapper, {
          src: value,
          alt: 'Profile Image',
          screen_name: record.screen_name,
        }),
    },
    {
      title: 'Screen Name',
      dataIndex: 'screen_name',
      render: (value) =>
        renderComponent(TextWrapper, {
          class: 'w-40 truncate',
          title: value,
          children: value,
        }),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (value) =>
        renderComponent(TextWrapper, {
          class: 'w-40 truncate',
          title: value,
          children: value,
        }),
    },
    {
      title: 'Blocking',
      dataIndex: 'blocking',
      render: (value) => renderComponent(BlockingWrapper, { blocking: value }),
    },
    {
      title: 'Verified',
      dataIndex: 'is_blue_verified',
      render: (value) => renderComponent(VerifiedWrapper, { verified: value }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (value) =>
        renderComponent(TextWrapper, {
          class: 'text-sm truncate',
          children: value,
        }),
    },
  ]

  let selectedRowKeys = $state<string[]>([])
  let searchParams = $state<SearchParams>({
    keyword: '',
    filterBlocking: 'unblocked',
    filterVerified: 'all',
    filterFollowing: 'notFollowing',
  })
  const filteredData = $derived.by(() => {
    const currentUserId = extractCurrentUserId()
    return (
      $query.data?.filter(
        (it) => it.id !== currentUserId && filterUser(it, searchParams),
      ) ?? []
    )
  })
  const selectedRows = $derived(
    filteredData.filter((it) => selectedRowKeys.includes(it.id)),
  )

  const filterVerifiedOptions: LabelValue[] = [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' },
  ]
  const filterBlockingOptions: LabelValue[] = [
    { value: 'all', label: 'All' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'unblocked', label: 'Unblocked' },
  ]
  const showFollowingOptions: LabelValue[] = [
    { value: 'all', label: 'All' },
    { value: 'following', label: 'Following' },
    { value: 'notFollowing', label: 'Not Following' },
  ]
</script>

<div class="h-full flex flex-col">
  <UserActions {selectedRows} class="mb-2">
    {#snippet search()}
      <Input
        placeholder="Search..."
        value={searchParams.keyword}
        oninput={(e) => (searchParams.keyword = String(e.currentTarget.value))}
        class="flex-1"
      />
    {/snippet}
  </UserActions>
  <div class="hidden md:flex items-center gap-2 mb-2">
    <SelectFilter
      label="Filter Blocking"
      options={filterBlockingOptions}
      bind:value={searchParams.filterBlocking}
    />
    <SelectFilter
      label="Filter Verified"
      options={filterVerifiedOptions}
      bind:value={searchParams.filterVerified}
    />
    <SelectFilter
      label="Filter Following"
      options={showFollowingOptions}
      bind:value={searchParams.filterFollowing}
      class="w-36"
    />
  </div>
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
  />
</div>
