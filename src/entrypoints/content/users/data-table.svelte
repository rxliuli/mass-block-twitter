<script lang="ts" generics="TData, TValue, TExtra">
  import {
    type ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type RowSelectionState,
    type SortingState,
    type Table as TableCore,
  } from '@tanstack/table-core'
  import { debounce } from 'lodash-es'
  import {
    createSvelteTable,
    FlexRender,
  } from '$lib/components/ui/data-table/index.js'
  import * as Table from '$lib/components/ui/table/index.js'
  import { Input } from '$lib/components/ui/input'
  import { type QueryObserverResult } from '@tanstack/svelte-query'
  import { type Snippet } from 'svelte'

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[]
    queryData: QueryObserverResult<TData[], Error>
  } & {
    extra: Snippet<[TableCore<TData>]>
  }

  let { columns, queryData, extra }: DataTableProps<TData, TValue> = $props()

  let sorting = $state<SortingState>([])
  let rowSelection = $state<RowSelectionState>({})
  let globalFilter = $state<string>('')

  const table = createSvelteTable({
    get data() {
      return queryData.data ?? []
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, id, value) => {
      const s = String(row.original[id as keyof typeof row.original])
      if (s.includes(value)) {
        return true
      }
      if (new RegExp(value).test(s)) {
        return true
      }
      return false
    },
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting)
      } else {
        sorting = updater
      }
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === 'function') {
        rowSelection = updater(rowSelection)
      } else {
        rowSelection = updater
      }
    },
    onGlobalFilterChange: (updater) => {
      if (typeof updater === 'function') {
        globalFilter = updater(globalFilter)
      } else {
        globalFilter = updater
      }
    },
    state: {
      get sorting() {
        return sorting
      },
      get rowSelection() {
        return rowSelection
      },
      get globalFilter() {
        return globalFilter
      },
    },
  })
</script>

<div class="rounded-md w-full overflow-x-auto h-full flex flex-col">
  <div class="flex items-center py-4 gap-2">
    <Input
      placeholder="Search..."
      value={globalFilter}
      oninput={(e) => table.setGlobalFilter(String(e.currentTarget.value))}
      class="max-w-sm"
    />
    {@render extra(table)}
  </div>
  <div class="rounded-md border h-full overflow-y-auto flex-1">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row data-state={row.getIsSelected() && 'selected'}>
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender
                  content={cell.column.columnDef.cell}
                  context={cell.getContext()}
                />
              </Table.Cell>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">
              {queryData.isLoading ? 'Loading...' : 'No results.'}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <div class="text-muted-foreground text-sm">
    {table.getFilteredSelectedRowModel().rows.length} of{' '}
    {table.getFilteredRowModel().rows.length} row(s) selected.
  </div>
</div>
