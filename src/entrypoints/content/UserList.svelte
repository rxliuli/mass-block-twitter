<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { userMutation, userQuery } from './query'
  import { columns } from './users/columns'
  import DataTable from './users/data-table.svelte'

  const query = userQuery()
  const mutation = userMutation()
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
      }}>Block Selected</Button
    >
  {/snippet}
</DataTable>
