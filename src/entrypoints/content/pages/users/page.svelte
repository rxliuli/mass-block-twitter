<script lang="ts">
  import { type User } from '$lib/db'
  import { userQuery } from '../../../../lib/query'
  import { renderComponent } from '$lib/components/ui/data-table'
  import AvatarWrapper from './components/AvatarWrapper.svelte'
  import DescriptionWrapper from './components/DescriptionWrapper.svelte'
  import BlockingWrapper from './components/BlockingWrapper.svelte'
  import type { Column } from '$lib/components/logic/a-data-table'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import UserActions from './components/UserActions.svelte'
  import { Input } from '$lib/components/ui/input'
  import Label from '$lib/components/ui/label/label.svelte'
  import { filterUser } from './utils/filterUser'
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte'

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
    },
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Blocking',
      dataIndex: 'blocking',
      render: (value) => renderComponent(BlockingWrapper, { blocking: value }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (value) =>
        renderComponent(DescriptionWrapper, { description: value }),
    },
  ]

  let selectedRowKeys = $state<string[]>([])
  let searchParams = $state({
    keyword: '',
    showBlocking: true,
    showFollowing: false,
  })
  const filteredData = $derived(
    $query.data?.filter((it) => filterUser(it, searchParams)) ?? [],
  )
  const selectedRows = $derived(
    filteredData.filter((it) => selectedRowKeys.includes(it.id)),
  )
</script>

<div class="h-[calc(100%-3rem)] flex flex-col">
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
  <div class="flex items-center gap-2 mb-2">
    <Label class="flex items-center gap-2">
      <span>Show Blocking</span>
      <Checkbox
        checked={searchParams.showBlocking}
        onCheckedChange={(checked) => (searchParams.showBlocking = checked)}
      />
    </Label>
    <Label class="flex items-center gap-2">
      <span>Show Following</span>
      <Checkbox
        checked={searchParams.showFollowing}
        onCheckedChange={(checked) => (searchParams.showFollowing = checked)}
      />
    </Label>
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
