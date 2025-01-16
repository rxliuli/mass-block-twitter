<script lang="ts">
  import { type User } from '$lib/db'
  import { userQuery } from '../../../../lib/query'
  import PageHeader from '$lib/components/logic/PageHeader.svelte'
  import { renderComponent } from '$lib/components/ui/data-table'
  import AvatarWrapper from './components/AvatarWrapper.svelte'
  import DescriptionWrapper from './components/DescriptionWrapper.svelte'
  import BlockingWrapper from './components/BlockingWrapper.svelte'
  import type { Column } from '$lib/components/logic/a-data-table'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import UserActions from './components/UserActions.svelte'
  import { matchByKeyword } from '$lib/util/matchByKeyword'
  import { Input } from '$lib/components/ui/input'

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
  let keyword = $state('')
  const filteredData = $derived(
    (keyword.trim()
      ? $query.data?.filter((it) =>
          matchByKeyword(keyword.trim(), [
            it.screen_name,
            it.name,
            it.description,
          ]),
        )
      : $query.data) ?? [],
  )
  const selectedRows = $derived(
    filteredData.filter((it) => selectedRowKeys.includes(it.id)),
  )
</script>

<div class="h-full flex flex-col">
  <PageHeader>Record Users</PageHeader>
  <UserActions {selectedRows}>
    {#snippet search()}
      <Input
        placeholder="Search..."
        value={keyword}
        oninput={(e) => (keyword = String(e.currentTarget.value))}
        class="flex-1"
      />
    {/snippet}
  </UserActions>
  <ADataTable
    class="flex-1"
    {columns}
    dataSource={filteredData}
    rowKey="id"
    rowSelection={{
      selectedRowKeys,
      onChange: (values) => (selectedRowKeys = values),
    }}
  />
</div>
