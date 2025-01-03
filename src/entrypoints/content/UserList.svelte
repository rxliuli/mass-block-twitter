<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { dbApi, type User } from '$lib/db'
  import { userMutation, userQuery } from './query'
  import { columns } from './users/columns'
  import DataTable from './users/data-table.svelte'
  import { saveAs } from 'file-saver'
  import { Parser } from '@json2csv/plainjs'
  import { fileSelector } from '$lib/util/fileSelector'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { toast } from 'svelte-sonner'
  import {
    DownloadIcon,
    ImportIcon,
    SettingsIcon,
    ShieldBan,
  } from 'lucide-svelte'
  import TableExtraButton from '$lib/components/logic/TableExtraButton.svelte'
  import { router } from './route.svelte'
  import * as Dialog from '$lib/components/ui/dialog'

  const query = userQuery()
  const mutation = userMutation()

  function onExport(users: User[]) {
    const parser = new Parser({
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    const csv = parser.parse(users)
    saveAs(new Blob([csv]), `block_list_${new Date().toISOString()}.csv`)
    toast.success(`Exported ${users.length} users`, { duration: 5000 })
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
      `Imported ${newUsers.length} users, ignored ${users.length - newUsers.length} users`,
    )
  }
</script>

<Dialog.Header class="mb-0">
  <Dialog.Title>Record Users</Dialog.Title>
</Dialog.Header>
<DataTable queryData={$query} {columns}>
  {#snippet extra(table)}
    <TableExtraButton
      onclick={async () => {
        const users = table
          .getFilteredSelectedRowModel()
          .rows.map((row) => row.original)
          .filter((it) => !it.blocking)
        await $mutation.mutateAsync({ users, action: 'block' })
      }}
      text="Block Selected"
    >
      {#snippet icon()}
        <ShieldBan color={'red'} class="w-4 h-4" />
      {/snippet}
    </TableExtraButton>
    <TableExtraButton
      text="Unblock Selected"
      onclick={async () => {
        const users = table
          .getFilteredSelectedRowModel()
          .rows.map((row) => row.original)
          .filter((it) => it.blocking)
        await $mutation.mutateAsync({ users, action: 'unblock' })
      }}
    >
      {#snippet icon()}
        <ShieldBan color={'gray'} class="w-4 h-4" />
      {/snippet}
    </TableExtraButton>
    <TableExtraButton
      onclick={() => {
        const users = table
          .getFilteredSelectedRowModel()
          .rows.map((row) => row.original)
        onExport(users)
      }}
      text="Export Selected"
    >
      {#snippet icon()}
        <DownloadIcon class="w-4 h-4" />
      {/snippet}
    </TableExtraButton>
    <TableExtraButton onclick={onImportBlockList} text="Import Block List">
      {#snippet icon()}
        <ImportIcon class="w-4 h-4" />
      {/snippet}
    </TableExtraButton>
    <Button
      variant="outline"
      size="icon"
      onclick={() => (router.path = '/settings')}
    >
      <SettingsIcon class="w-4 h-4" />
    </Button>
  {/snippet}
</DataTable>
