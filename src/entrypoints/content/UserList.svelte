<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { dbApi, type User } from '$lib/db'
  import { userBlockMutation, userQuery } from './query'
  import { columns } from './users/columns'
  import DataTable from './users/data-table.svelte'
  import { saveAs } from 'file-saver'
  import { Parser } from '@json2csv/plainjs'
  import { fileSelector } from '$lib/util/fileSelector'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { toast } from 'svelte-sonner'

  const query = userQuery()
  const mutation = userBlockMutation()

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
    await dbApi.users.record(
      users.map(
        (it) =>
          ({
            ...it,
            blocking: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as User,
      ),
    )
    await $mutation.mutateAsync(users)
  }
</script>

<DataTable queryData={$query} {columns}>
  {#snippet extra(table)}
    <Button
      onclick={async () => {
        const users = table
          .getFilteredSelectedRowModel()
          .rows.map((row) => row.original)
          .filter((it) => !it.blocking)
        await $mutation.mutateAsync(users)
      }}
    >
      Block Selected
    </Button>
    <Button
      onclick={() => {
        const users = table
          .getFilteredSelectedRowModel()
          .rows.map((row) => row.original)
        onExport(users)
      }}
    >
      Export Selected
    </Button>
    <Button onclick={onImportBlockList}>Import Block List</Button>
  {/snippet}
</DataTable>
